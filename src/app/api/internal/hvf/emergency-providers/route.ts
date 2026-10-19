import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProviderCategory } from "@prisma/client";
import {
  apiKeysMatch,
  buildEmergencyProviderWhere,
  mapAndRankEmergencyProviders,
} from "@/lib/hvf-emergency-providers";

// ---------------------------------------------------------------------------
// Private / internal API – HydroVacFinder emergency provider search
// ---------------------------------------------------------------------------
// This endpoint is NOT public. It requires a valid x-hvf-api-key header.
// It returns provider discovery details only. Customer requests must be submitted
// through DieselRepairFinder so providers can accept them and pay with lead credits.
//
// Distance ranking:
//   When `latitude`/`longitude` are supplied the response is ranked by real
//   distance from that origin (closest first) and filtered to `radiusMiles`
//   (default 100). This is what lets a Mishawaka jobsite get South Bend
//   providers instead of Indianapolis ones.
// ---------------------------------------------------------------------------

const EXPECTED_API_KEY = process.env.HVF_INTERNAL_API_KEY;

const VALID_CATEGORIES = new Set<string>(Object.values(ProviderCategory));

/** Default search radius (miles) when an origin is given without a radius. */
const DEFAULT_RADIUS_MILES = 100;
const PRIVATE_RESPONSE_HEADERS = { "Cache-Control": "private, no-store" };

function unauthorized(reason = "Missing or invalid API key") {
  return NextResponse.json(
    { ok: false, error: reason },
    { status: 401, headers: PRIVATE_RESPONSE_HEADERS }
  );
}

export async function GET(req: NextRequest) {
  // --- Auth guard -----------------------------------------------------------
  if (!EXPECTED_API_KEY) {
    console.error("HVF_INTERNAL_API_KEY is not set on the Diesel Repair Finder server.");
    return NextResponse.json(
      { ok: false, error: "Server configuration error" },
      { status: 500, headers: PRIVATE_RESPONSE_HEADERS }
    );
  }

  const apiKey = req.headers.get("x-hvf-api-key");
  if (!apiKey || !apiKeysMatch(apiKey, EXPECTED_API_KEY)) {
    return unauthorized();
  }

  // --- Parse query params ---------------------------------------------------
  const { searchParams } = req.nextUrl;

  const city = searchParams.get("city")?.trim() || undefined;
  const state = searchParams.get("state")?.trim() || undefined;
  const categoryParam = searchParams.get("category")?.trim().toUpperCase() || undefined;

  // Reject unknown categories with a clear 400 instead of a Prisma 500.
  if (categoryParam && !VALID_CATEGORIES.has(categoryParam)) {
    return NextResponse.json(
      {
        ok: false,
        error: `Invalid category. Expected one of: ${[...VALID_CATEGORIES].join(", ")}`,
      },
      { status: 400, headers: PRIVATE_RESPONSE_HEADERS }
    );
  }
  const category = categoryParam;

  const latParam = searchParams.get("latitude");
  const lngParam = searchParams.get("longitude");
  const radiusParam = searchParams.get("radiusMiles");

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 10, 1), 100) : 50;

  const latitude = latParam ? Number.parseFloat(latParam) : undefined;
  const longitude = lngParam ? Number.parseFloat(lngParam) : undefined;
  const parsedRadius = radiusParam ? Number.parseFloat(radiusParam) : undefined;
  const effectiveRadiusMiles =
    typeof parsedRadius === "number" && Number.isFinite(parsedRadius) && parsedRadius > 0
      ? parsedRadius
      : DEFAULT_RADIUS_MILES;

  // --- Query providers (with locations for distance support) -----------------
  try {
    const hasOrigin =
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude);

    const where = buildEmergencyProviderWhere({
      city,
      state,
      category,
      latitude,
      longitude,
      radiusMiles: effectiveRadiusMiles,
    });

    const providers = await prisma.serviceProvider.findMany({
      where,
      include: {
        locations: {
          where: { active: true },
          select: {
            id: true,
            locationName: true,
            address: true,
            city: true,
            state: true,
            zip: true,
            serviceRadius: true,
            isPrimary: true,
            latitude: true,
            longitude: true,
            phone: true,
            email: true,
            contactName: true,
          },
        },
      },
      ...(hasOrigin ? {} : { take: limit }),
      orderBy: [{ tier: "desc" }, { rating: "desc" }, { businessName: "asc" }],
    });

    const result = mapAndRankEmergencyProviders(providers, {
      latitude,
      longitude,
      radiusMiles: effectiveRadiusMiles,
      limit,
      appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://dieselrepairfinder.com",
    });

    return NextResponse.json(
      {
        ok: true,
        providers: result.providers,
        meta: {
          total: result.providers.length,
          distanceRanked: result.distanceRanked,
          radiusMilesUsed: result.radiusMilesUsed,
          candidatesConsidered: result.candidatesConsidered,
          filters: { city, state, category, latitude, longitude, radiusMiles: parsedRadius ?? null },
        },
      },
      { status: 200, headers: PRIVATE_RESPONSE_HEADERS }
    );
  } catch (error) {
    console.error("Emergency providers internal API error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500, headers: PRIVATE_RESPONSE_HEADERS }
    );
  }
}
