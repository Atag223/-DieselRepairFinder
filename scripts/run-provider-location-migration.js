#!/usr/bin/env node
/**
 * Applies the missing ProviderLocation migration (20240106000000) to the
 * Diesel Repair Finder database.
 *
 * Prisma Migrate cannot run over the Supabase pgbouncer port, so this runner
 * applies the SQL directly through PrismaClient (works over the pooler).
 *
 * Idempotent — safe to run multiple times.
 * Usage: node scripts/run-provider-location-migration.js
 */

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

function parseEnvFile(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx < 1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  } catch (err) {
    console.error(`Could not read ${filePath}:`, err.message);
    process.exit(1);
  }
  return env;
}

// Prefer .env.local, then .env
const candidates = [
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../.env"),
];
let env = {};
for (const file of candidates) {
  if (fs.existsSync(file)) {
    env = { ...env, ...parseEnvFile(file) };
  }
}

if (env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL;
if (env.DIRECT_URL) process.env.DIRECT_URL = env.DIRECT_URL;

if (!process.env.DATABASE_URL) {
  console.error("No DATABASE_URL found in .env/.env.local");
  process.exit(1);
}

const sqlPath = path.resolve(__dirname, "apply-provider-location-migration.sql");
const rawSql = fs.readFileSync(sqlPath, "utf8");

function stripLeadingComments(stmt) {
  return stmt
    .split("\n")
    .filter((line, idx, arr) => {
      if (idx === 0 || arr.slice(0, idx).every((l) => l.trim().startsWith("--") || l.trim() === "")) {
        return !line.trim().startsWith("--");
      }
      return true;
    })
    .join("\n")
    .trim();
}

function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inDollarQuote = false;

  for (const line of sql.split("\n")) {
    const dollarMatches = (line.match(/\$\$/g) || []).length;
    if (dollarMatches % 2 !== 0) {
      inDollarQuote = !inDollarQuote;
    }

    current += line + "\n";

    if (!inDollarQuote && line.trimEnd().endsWith(";")) {
      const stripped = stripLeadingComments(current);
      if (stripped.length > 0) statements.push(stripped);
      current = "";
    }
  }

  const trailing = stripLeadingComments(current);
  if (trailing.length > 0) statements.push(trailing);

  return statements;
}

async function main() {
  const prisma = new PrismaClient();
  const statements = splitStatements(rawSql);

  console.log(`Running ${statements.length} SQL statement(s)...\n`);

  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
      process.stdout.write(`[${i + 1}/${statements.length}] ${preview}... `);
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log("OK");
      } catch (err) {
        console.log("ERROR");
        console.error("  →", err.message);
      }
    }
    console.log("\n✓ Migration complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
