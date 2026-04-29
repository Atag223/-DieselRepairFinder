/**
 * seed-providers-from-google.ts
 *
 * Seeds DieselRepairFinder with providers from 5 major cities in each of the
 * 50 US states using the Google Places API Text Search endpoint.
 *
 * Usage:
 *   npm run seed:providers                        # full nationwide run
 *   npm run seed:providers -- --state TX          # single state
 *   npm run seed:providers -- --state TX --city Dallas  # single city
 *   npm run seed:providers -- --max-results 10    # cap results per query (default: 20)
 *   npm run seed:providers -- --delay 500         # ms between requests (default: 200)
 *
 * Required environment variable:
 *   GOOGLE_PLACES_API_KEY  – A valid Google Cloud API key with the Places API enabled.
 *
 * Behaviour:
 *   - Searches each city × search term combination (4 terms × 5 cities × 50 states).
 *   - Caps each query at MAX_RESULTS (default 20, max 20 per Google Places API limit).
 *   - Deduplicates by Google Place ID when available, otherwise by
 *     businessName + city + state + phone.
 *   - Skips any provider that already exists in the database.
 *   - Never overwrites an existing record.
 *   - Imports providers as UNVERIFIED / FREE with freeLeadsRemaining = 3.
 *   - Logs total API calls made at the end of the run.
 */

import { PrismaClient, ProviderCategory, ProviderSource, VerificationStatus, ProviderTier } from '@prisma/client'

const prisma = new PrismaClient()

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { state?: string; city?: string; maxResults: number; delayMs: number } {
  const args = process.argv.slice(2)
  let state: string | undefined
  let city: string | undefined
  let maxResults = 20
  let delayMs = 200

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--state' && args[i + 1]) {
      state = args[++i].toUpperCase()
    } else if (args[i] === '--city' && args[i + 1]) {
      city = args[++i]
    } else if (args[i] === '--max-results' && args[i + 1]) {
      const parsed = parseInt(args[++i], 10)
      if (!isNaN(parsed) && parsed > 0) {
        maxResults = Math.min(parsed, 20) // Google Places API max is 20
      }
    } else if (args[i] === '--delay' && args[i + 1]) {
      const parsed = parseInt(args[++i], 10)
      if (!isNaN(parsed) && parsed >= 0) {
        delayMs = parsed
      }
    }
  }

  return { state, city, maxResults, delayMs }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY

const SEARCH_TERMS: { query: string; category: ProviderCategory }[] = [
  { query: 'mobile diesel mechanic', category: ProviderCategory.DIESEL_MECHANIC },
  { query: 'mobile tire service', category: ProviderCategory.MOBILE_TIRE_SERVICE },
  { query: 'heavy duty wrecker', category: ProviderCategory.HEAVY_DUTY_WRECKER },
  { query: 'heavy duty towing', category: ProviderCategory.HEAVY_DUTY_WRECKER },
]

// ---------------------------------------------------------------------------
// State → top-5 major cities mapping
// ---------------------------------------------------------------------------

const STATE_CITIES: Record<string, string[]> = {
  AL: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale'],
  AR: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
  CA: ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno'],
  CO: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood'],
  CT: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury'],
  DE: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  FL: ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg'],
  GA: ['Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah'],
  HI: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu'],
  ID: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello'],
  IL: ['Chicago', 'Aurora', 'Rockford', 'Joliet', 'Naperville'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel'],
  IA: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City'],
  KS: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Olathe'],
  KY: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Metairie', 'Lafayette'],
  ME: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'],
  MD: ['Baltimore', 'Columbia', 'Germantown', 'Silver Spring', 'Waldorf'],
  MA: ['Boston', 'Worcester', 'Springfield', 'Lowell', 'Cambridge'],
  MI: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor'],
  MN: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington'],
  MS: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi'],
  MO: ['Kansas City', 'Saint Louis', 'Springfield', 'Columbia', 'Independence'],
  MT: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte'],
  NE: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'],
  NV: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
  NH: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover'],
  NJ: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison'],
  NM: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'],
  NY: ['New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton'],
  OR: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
  RI: ['Providence', 'Cranston', 'Warwick', 'Pawtucket', 'East Providence'],
  SC: ['Columbia', 'Charleston', 'North Charleston', 'Mount Pleasant', 'Greenville'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'],
  TN: ['Memphis', 'Nashville', 'Knoxville', 'Chattanooga', 'Clarksville'],
  TX: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'],
  VT: ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier'],
  VA: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News'],
  WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
  WV: ['Charleston', 'Huntington', 'Parkersburg', 'Morgantown', 'Wheeling'],
  WI: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine'],
  WY: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs'],
}

// ---------------------------------------------------------------------------
// Google Places API helper
// ---------------------------------------------------------------------------

interface PlaceResult {
  id?: string
  displayName?: { text: string }
  formattedAddress?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  googleMapsUri?: string
  location?: { latitude: number; longitude: number }
}

interface PlacesSearchResponse {
  places?: PlaceResult[]
  error?: { message: string; code: number }
}

async function searchPlaces(
  textQuery: string,
  apiKey: string,
  maxResults: number,
): Promise<PlaceResult[]> {
  const url = 'https://places.googleapis.com/v1/places:searchText'
  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.nationalPhoneNumber',
    'places.internationalPhoneNumber',
    'places.websiteUri',
    'places.googleMapsUri',
    'places.location',
  ].join(',')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({ textQuery, pageSize: maxResults }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error(`  [API Error] ${response.status}: ${text}`)
    return []
  }

  const data: PlacesSearchResponse = await response.json()
  return data.places ?? []
}

// ---------------------------------------------------------------------------
// Deduplication helpers
// ---------------------------------------------------------------------------

async function providerExists(
  googlePlaceId: string | undefined,
  businessName: string,
  city: string,
  state: string,
  phone: string | undefined,
): Promise<boolean> {
  if (googlePlaceId) {
    const existing = await prisma.serviceProvider.findUnique({
      where: { googlePlaceId },
      select: { id: true },
    })
    if (existing) return true
  }

  // Fallback: businessName + city + state (+ phone when available)
  const existing = await prisma.serviceProvider.findFirst({
    where: {
      businessName,
      city,
      state,
      ...(phone ? { phone } : {}),
    },
    select: { id: true },
  })
  return existing !== null
}

// ---------------------------------------------------------------------------
// Import a single place result
// ---------------------------------------------------------------------------

async function importPlace(
  place: PlaceResult,
  category: ProviderCategory,
  city: string,
  state: string,
): Promise<'imported' | 'skipped'> {
  const businessName = place.displayName?.text
  if (!businessName) return 'skipped'

  const googlePlaceId = place.id
  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? undefined
  const website = place.websiteUri ?? undefined
  const googleMapsUri = place.googleMapsUri ?? undefined
  const formattedAddress = place.formattedAddress ?? undefined
  const latitude = place.location?.latitude ?? undefined
  const longitude = place.location?.longitude ?? undefined

  // Deduplicate
  const exists = await providerExists(googlePlaceId, businessName, city, state, phone)
  if (exists) return 'skipped'

  // Default services for each category
  const defaultServices: Record<ProviderCategory, string[]> = {
    DIESEL_MECHANIC: ['Engine Repair', 'Electrical Systems', 'Fuel System', 'Preventive Maintenance'],
    MOBILE_TIRE_SERVICE: ['Tire Service'],
    HEAVY_DUTY_WRECKER: ['Heavy-Duty Towing', 'Recovery'],
  }

  await prisma.serviceProvider.create({
    data: {
      businessName,
      city,
      state,
      phone: phone ?? null,
      website: website ?? null,
      googlePlaceId: googlePlaceId ?? null,
      googleMapsUri: googleMapsUri ?? null,
      formattedAddress: formattedAddress ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      providerCategory: category,
      services: defaultServices[category],
      tier: ProviderTier.FREE,
      freeLeadsRemaining: 3,
      source: ProviderSource.GOOGLE_PLACES,
      verificationStatus: VerificationStatus.UNVERIFIED,
      notes: 'Imported from Google Places; needs phone verification.',
    },
  })

  return 'imported'
}

// ---------------------------------------------------------------------------
// Rate-limit helper (simple delay)
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!GOOGLE_PLACES_API_KEY) {
    console.error(
      'ERROR: GOOGLE_PLACES_API_KEY environment variable is not set.\n' +
      'Add it to your .env file and try again.',
    )
    process.exit(1)
  }

  const { state: filterState, city: filterCity, maxResults, delayMs } = parseArgs()

  // Validate --state argument
  if (filterState && !(filterState in STATE_CITIES)) {
    console.error(`ERROR: Unknown state "${filterState}". Use a two-letter state code (e.g. TX, CA).`)
    process.exit(1)
  }

  // Validate --city argument (requires --state)
  if (filterCity && !filterState) {
    console.error('ERROR: --city requires --state to be specified (e.g. --state TX --city Dallas).')
    process.exit(1)
  }

  // Determine scope
  const statesToProcess = filterState ? [filterState] : Object.keys(STATE_CITIES)
  const scope = filterCity
    ? `${filterCity}, ${filterState}`
    : filterState
      ? `all cities in ${filterState}`
      : 'nationwide (all 50 states)'

  console.log(`\nDieselRepairFinder — Google Places Provider Seeder`)
  console.log(`  Scope       : ${scope}`)
  console.log(`  Max results : ${maxResults} per query`)
  console.log(`  Delay       : ${delayMs} ms between requests`)
  console.log(`  Search terms: ${SEARCH_TERMS.length}`)
  console.log('')

  let totalImported = 0
  let totalSkipped = 0
  let totalErrors = 0
  let totalApiCalls = 0

  for (const state of statesToProcess) {
    const allCities = STATE_CITIES[state]
    const citiesToProcess = filterCity
      ? allCities.filter((c) => c.toLowerCase() === filterCity.toLowerCase())
      : allCities

    if (citiesToProcess.length === 0) {
      console.error(`ERROR: City "${filterCity}" not found in state ${state}.`)
      console.error(`  Available cities: ${allCities.join(', ')}`)
      process.exit(1)
    }

    console.log(`\n── ${state} (${citiesToProcess.length} ${citiesToProcess.length === 1 ? 'city' : 'cities'}) ──`)

    for (const city of citiesToProcess) {
      for (const { query, category } of SEARCH_TERMS) {
        const textQuery = `${query} ${city} ${state}`
        process.stdout.write(`  Searching: "${textQuery}" ... `)

        try {
          totalApiCalls++
          const places = await searchPlaces(textQuery, GOOGLE_PLACES_API_KEY, maxResults)
          let imported = 0
          let skipped = 0

          for (const place of places) {
            const result = await importPlace(place, category, city, state)
            if (result === 'imported') {
              imported++
              totalImported++
            } else {
              skipped++
              totalSkipped++
            }
          }

          console.log(`${places.length} results → ${imported} imported, ${skipped} skipped`)
        } catch (err) {
          console.error(`ERROR: ${err}`)
          totalErrors++
        }

        // Respect Google Places API rate limits.
        // The Places API (New) allows 600 QPM on the free tier; the default
        // 200 ms keeps the script well under that ceiling. Increase --delay
        // if you observe 429 responses.
        await sleep(delayMs)
      }
    }
  }

  console.log('\n════════════════════════════════')
  console.log(`Seeding complete!`)
  console.log(`  Scope      : ${scope}`)
  console.log(`  API calls  : ${totalApiCalls}`)
  console.log(`  Imported   : ${totalImported}`)
  console.log(`  Skipped    : ${totalSkipped}`)
  console.log(`  Errors     : ${totalErrors}`)
  console.log('════════════════════════════════\n')

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error(err)
  await prisma.$disconnect()
  process.exit(1)
})
