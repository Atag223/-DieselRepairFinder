import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma, ProviderCategory } from "@prisma/client";
import { calculateDistanceMiles, getBoundingBoxMiles } from "@/lib/distance";

// ---------------------------------------------------------------------------
// Private / internal API – HydroVacFinder emergency provider search
// ---------------------------------------------------------------------------
// This endpoint is NOT public. It requires a valid x-hvf-api-key header.
// It returns provider contact info (phone / email / website) that the public
// DieselRepairFinder.com site deliberately hides until a provider accepts
// a lead.  HydroVacFinder is a paid operational tool, so it is authorised
// to see full provider details for project planning & emergency crew support.
//
// Distance ranking:
//   When `latitude`/`longitude` are supplied the response is ranked by real
//   distance from that origin (closest first) and filtered to `radiusMiles`
//   (default 100). This is what lets a Mishawaka jobsite get South Bend
//   providers instead of Indianapolis ones.
// ---------------------------------------------------------------------------

const EXPECTED_API_KEY = process.env.HVF_INTERNAL_API_KEY;

const VALID_CATEGORIES = new Set<string>(Object.values(ProviderCategory));

/** Upper bound on rows loaded before distance filtering. */
const MAX_CANDIDATES = 500;
/** Default search radius (miles) when an origin is given without a radius. */
const DEFAULT_RADIUS_MILES = 100;

function unauthorized(reason = "Missing or invalid API key") {
  return NextResponse.json({ ok: false, error: reason }, { status: 401 });
}

/** Constant-time comparison so the shared secret is not leaked by timing. */
function apiKeysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Extract "<city>, <ST>" from a Google Places `formattedAddress`
 * (e.g. "58438 Filbert Rd, Mishawaka, IN 46544, USA").
 *
 * Some imported rows have a `city`/`state` that disagrees with their own
 * coordinates and formatted address (the Google Places import is authoritative).
 * Reporting the coordinate-consistent locality keeps provider results accurate.
 */
function parseUsCityState(
  formattedAddress: string | null | undefined
): { city: string; state: string } | null {
  if (!formattedAddress) return null;
  const parts = formattedAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 3) return null;

  const isCountryTail = /^(usa|united states)$/i.test(parts[parts.length - 1]);
  const stateIndex = parts.length - (isCountryTail ? 2 : 1);
  const cityIndex = stateIndex - 1;
  const statePart = parts[stateIndex];
  const cityPart = parts[cityIndex];
  if (!statePart || !cityPart) return null;

  const match = statePart.match(/^([A-Za-z]{2})\b/);
  if (!match) return null;

  return { city: cityPart, state: match[1].toUpperCase() };
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
      { status: 400 }
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
    // --- Distance-aware candidate selection -----------------------------------
    //
    // When an origin (latitude/longitude) is supplied the caller expects
    // providers RANKED BY REAL DISTANCE. We must therefore NOT let `take`
    // truncate the candidate set before distances are computed — doing that
    // previously returned the first N providers in tier/name order (e.g.
    // Indianapolis) instead of the closest ones (e.g. South Bend).
    //
    // So: pre-filter with a bounding box for the requested radius, load up to
    // MAX_CANDIDATES rows, compute Haversine, then filter + sort + limit.
    const hasOrigin =
      typeof latitude === "number" &&
      Number.isFinite(latitude) &&
      typeof longitude === "number" &&
      Number.isFinite(longitude);

    if (hasOrigin) {
      const bbox = getBoundingBoxMiles(
        latitude as number,
        longitude as number,
        effectiveRadiusMiles
      );
      const latRange = { gte: bbox.minLat, lte: bbox.maxLat };
      const lngRange = { gte: bbox.minLng, lte: bbox.maxLng };

      where.OR = [
        { latitude: latRange, longitude: lngRange },
        {
          locations: {
            some: { active: true, latitude: latRange, longitude: lngRange },
          },
        },
      ];
    }

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
            phone: true,
            serviceRadius: true,
            isPrimary: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      take: hasOrigin ? MAX_CANDIDATES : limit,
      orderBy: [{ tier: "desc" }, { rating: "desc" }, { businessName: "asc" }],
    });

    // --- Map ------------------------------------------------------------------
    const mapped = providers.map((p) => {
      let distanceMiles: number | null = null;
      let nearestLocation: (typeof p.locations)[number] | null = null;
      let nearestIsMainCoords = false;

      if (hasOrigin) {
        const originLat = latitude as number;
        const originLng = longitude as number;

        // The provider's own coordinates (usually the registered address).
        if (typeof p.latitude === "number" && typeof p.longitude === "number") {
          distanceMiles =
            Math.round(
              calculateDistanceMiles(originLat, originLng, p.latitude, p.longitude) * 10
            ) / 10;
          nearestIsMainCoords = true;
        }

        // Any active branch location that is closer wins — that is the depot
        // the provider would actually dispatch from.
        for (const loc of p.locations) {
          if (
            typeof loc.latitude !== "number" ||
            typeof loc.longitude !== "number"
          ) {
            continue;
          }
          const d =
            Math.round(
              calculateDistanceMiles(originLat, originLng, loc.latitude, loc.longitude) * 10
            ) / 10;

          if (distanceMiles === null || d < distanceMiles) {
            distanceMiles = d;
            nearestLocation = loc;
            nearestIsMainCoords = false;
          }
        }
      }

      // A branch location is the most precise signal; otherwise trust the
      // Google Places formatted address, which always matches the coordinates.
      const parsed = parseUsCityState(p.formattedAddress);
      const city = nearestLocation?.city ?? parsed?.city ?? p.city;
      const state = nearestLocation?.state ?? parsed?.state ?? p.state;
      const storedCityMismatch =
        !nearestLocation &&
        Boolean(parsed) &&
        (parsed?.city !== p.city || parsed?.state !== p.state);

      return {
        id: p.id,
        name: p.businessName,
        category: p.providerCategory,
        city,
        state,
        address: nearestLocation?.address ?? p.formattedAddress ?? null,
        primaryCity: p.city,
        primaryState: p.state,
        /** True when the stored city/state disagrees with the coordinates. */
        locationMismatch: storedCityMismatch,
        phone: p.phone ?? nearestLocation?.phone ?? null,
        email: p.email,
        website: p.website,
        services: p.services,
        is24_7: p.is24_7,
        tier: p.tier,
        verificationStatus: p.verificationStatus,
        rating: p.rating,
        distanceMiles,
        distanceFromMainAddress: nearestIsMainCoords,
        nearestLocation: nearestLocation
          ? {
              id: nearestLocation.id,
              locationName: nearestLocation.locationName,
              address: nearestLocation.address,
              city: nearestLocation.city,
              state: nearestLocation.state,
              zip: nearestLocation.zip,
              phone: nearestLocation.phone,
              serviceRadius: nearestLocation.serviceRadius,
              isPrimary: nearestLocation.isPrimary,
            }
          : null,
        source: "DieselRepairFinder.com" as const,
      };
    });

    // --- Filter / sort / limit ------------------------------------------------
    let results = mapped;

    if (hasOrigin) {
      // Only providers we can actually locate, inside the requested radius.
      results = mapped
        .filter(
          (item): item is typeof item & { distanceMiles: number } =>
            item.distanceMiles !== null && item.distanceMiles <= effectiveRadiusMiles
        )
        .sort((a, b) => {
          if (a.distanceMiles !== b.distanceMiles) {
            return a.distanceMiles - b.distanceMiles;
          }
          return a.name.localeCompare(b.name);
        });
    }

    const limited = results.slice(0, limit);

    return NextResponse.json(
      {
        ok: true,
        providers: limited,
        meta: {
          total: limited.length,
          distanceRanked: hasOrigin,
          radiusMilesUsed: hasOrigin ? effectiveRadiusMiles : null,
          candidatesConsidered: providers.length,
          filters: { city, state, category, latitude, longitude, radiusMiles: parsedRadius ?? null },
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
