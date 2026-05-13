/**
 * Backfill script: creates a primary ProviderLocation for each existing provider
 * that has no locations yet.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/backfill-provider-locations.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const providers = await prisma.serviceProvider.findMany({
    where: {
      deletedAt: null,
      locations: { none: {} },
    },
    select: {
      id: true,
      city: true,
      state: true,
      phone: true,
      contactName: true,
      serviceRadius: true,
    },
  })

  console.log(`Found ${providers.length} providers without locations. Backfilling…`)

  let created = 0
  for (const provider of providers) {
    await prisma.providerLocation.create({
      data: {
        providerId: provider.id,
        city: provider.city,
        state: provider.state,
        serviceRadius: provider.serviceRadius ?? 50,
        phone: provider.phone ?? null,
        contactName: provider.contactName ?? null,
        isPrimary: true,
        active: true,
      },
    })
    created++
    if (created % 50 === 0) {
      console.log(`  … created ${created} locations so far`)
    }
  }

  console.log(`Done. Created ${created} ProviderLocation records.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
