import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Private / internal API – HydroVacFinder emergency provider search
// ---------------------------------------------------------------------------
// This endpoint is NOT public. It requires a valid x-hvf-api-key header.
// It returns provider contact info (phone / email / website) that the public
// DieselRepairFinder.com site deliberately hides until a provider accepts
// a lead.  HydroVacFinder is a paid operational tool, so it is authorised
// to see full provider details for project planning & emergency crew support.
// ---------------------------------------------------------------------------

const EXPECTED_API_KEY = process.env.HVF_INTERNAL_API_KEY;

function unauthorized(reason = "Missing or invalid API key") {
  return NextResponse.json({ ok: false, error: reason }, { status: 401 });
}

/** Haversine distance in miles between two lat/lng points. */
function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  // --- Auth guard -----------------------------------------------------------
  if (!EXPECTED_API_KEY) {
    console.error("HVF_INTERNAL_API_KEY is not set on the Diesel Repair Finder server.");
    return NextResponse.json(
      { ok: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  const apiKey = req.headers.get("x-hvf-api-key");
  if (!apiKey || apiKey !== EXPECTED_API_KEY) {
    return unauthorized();
  }

  // --- Parse query params ---------------------------------------------------
  const { searchParams } = req.nextUrl;

  const city = searchParams.get("city")?.trim() || undefined;
  const state = searchParams.get("state")?.trim() || undefined;
  const category = searchParams.get("category")?.trim() || undefined;

  const latParam = searchParams.get("latitude");
  const lngParam = searchParams.get("longitude");
  const radiusParam = searchParams.get("radiusMiles");

  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 10, 1), 100) : 50;

  const latitude = latParam ? Number.parseFloat(latParam) : undefined;
  const longitude = lngParam ? Number.parseFloat(lngParam) : undefined;
  const radiusMiles = radiusParam ? Number.parseFloat(radiusParam) : undefined;

  // --- Build where clause ---------------------------------------------------
  const where: Prisma.ServiceProviderWhereInput = {
    // Only active, non-deleted, non-suspended providers
    active: true,
    deletedAt: null,
    suspendedAt: null,
  };

  if (state) {
    where.state = { equals: state, mode: "insensitive" };
  }
  if (city) {
    where.city = { equals: city, mode: "insensitive" };
  }
  if (category) {
    // ProviderCategory is an enum – do a case-insensitive check via cast
    where.providerCategory = category as Prisma.EnumProviderCategoryFilter["equals"];
  }

  // --- Query providers (with locations for distance support) -----------------
  try {
    const providers = await prisma.serviceProvider.findMany({
      where,
      include: {
        locations: {
          where: { active: true },
          select: {
            id: true,
            city: true,
            state: true,
            latitude: true,
            longitude: true,
            locationName: true,
          },
        },
      },
      take: limit,
      orderBy: [{ tier: "desc" }, { rating: "desc" }, { businessName: "asc" }],
    });

    // --- Map & optionally filter by distance -----------------------------------
    const results = providers
      .map((p) => {
        let distanceMiles: number | null = null;

        // If caller provided a search origin + radius, compute the best
        // (shortest) distance across the provider's main coords + any active
        // location coordinates.
        if (
          typeof latitude === "number" &&
          typeof longitude === "number" &&
          !Number.isNaN(latitude) &&
          !Number.isNaN(longitude)
        ) {
          const candidates: number[] = [];

          if (
            typeof p.latitude === "number" &&
            typeof p.longitude === "number"
          ) {
            candidates.push(haversineMiles(latitude, longitude, p.latitude, p.longitude));
          }

          for (const loc of p.locations) {
            if (
              typeof loc.latitude === "number" &&
              typeof loc.longitude === "number"
            ) {
              candidates.push(
                haversineMiles(latitude, longitude, loc.latitude, loc.longitude)
              );
            }
          }

          if (candidates.length > 0) {
            distanceMiles = Math.min(...candidates);
            // Round to 1 decimal place
            distanceMiles = Math.round(distanceMiles * 10) / 10;
          }
        }

        // If radius is specified and we have a distance, exclude providers
        // outside the radius.
        if (
          typeof radiusMiles === "number" &&
          distanceMiles !== null &&
          distanceMiles > radiusMiles
        ) {
          return null; // filtered out
        }

        return {
          id: p.id,
          name: p.businessName,
          category: p.providerCategory,
          city: p.city,
          state: p.state,
          phone: p.phone,
          email: p.email,
          website: p.website,
          services: p.services,
          is24_7: p.is24_7,
          tier: p.tier,
          verificationStatus: p.verificationStatus,
          rating: p.rating,
          distanceMiles,
          source: "DieselRepairFinder.com" as const,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by distance if origin was provided, otherwise preserve DB order
    if (typeof latitude === "number" && typeof longitude === "number") {
      results.sort((a, b) => (a.distanceMiles ?? 9999) - (b.distanceMiles ?? 9999));
    }

    return NextResponse.json(
      {
        ok: true,
        providers: results,
        meta: {
          total: results.length,
          filters: { city, state, category, latitude, longitude, radiusMiles },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Emergency providers internal API error:", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
