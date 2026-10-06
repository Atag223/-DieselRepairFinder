/**
 * Calculates the great-circle distance between two points using the Haversine formula.
 * Returns distance in miles.
 */
export function calculateDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}
const MILES_PER_DEGREE_LATITUDE = 69

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

/**
 * Latitude/longitude bounding box for a radius in miles.
 * Used to pre-filter rows in the database before computing exact Haversine
 * distances, so we never load an entire table into memory.
 */
export function getBoundingBoxMiles(
  lat: number,
  lng: number,
  radiusMiles: number
): BoundingBox {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LATITUDE
  const lngDelta =
    radiusMiles / (Math.cos(toRad(lat)) * MILES_PER_DEGREE_LATITUDE)

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}