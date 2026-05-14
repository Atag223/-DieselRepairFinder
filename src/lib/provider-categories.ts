export const PROVIDER_CATEGORY_DEFINITIONS = [
  {
    value: 'DIESEL_MECHANIC',
    slug: 'diesel-mechanic',
    label: 'Mobile Diesel Mechanic',
    shortLabel: 'Diesel Mechanic',
    pluralLabel: 'Diesel Mechanics',
    icon: '🔧',
    desc: 'Mobile diesel repair & maintenance',
    issueTypes: [
      'No Start',
      'Engine Problem',
      'Electrical',
      'DEF / Emissions',
      'Air / Brakes',
      'Preventive Maintenance',
      'Other',
    ],
  },
  {
    value: 'MOBILE_TIRE_SERVICE',
    slug: 'mobile-tire-service',
    label: 'Mobile Tire Service',
    shortLabel: 'Mobile Tire Service',
    pluralLabel: 'Mobile Tire Services',
    icon: '🛞',
    desc: 'On-site tire repair & replacement',
    issueTypes: [
      'Steer Tire',
      'Drive Tire',
      'Trailer Tire',
      'Blowout',
      'Flat Repair',
      'Tire Replacement',
      'Other',
    ],
  },
  {
    value: 'HEAVY_DUTY_WRECKER',
    slug: 'heavy-duty-wrecker',
    label: 'Heavy-Duty Wrecker',
    shortLabel: 'Heavy-Duty Wrecker',
    pluralLabel: 'Heavy-Duty Wreckers',
    icon: '🚨',
    desc: 'Heavy towing & recovery',
    issueTypes: [
      'Semi Truck Tow',
      'Heavy Recovery',
      'Winching',
      'Accident Recovery',
      'Equipment Move',
      'Stuck / Off Road',
      'Other',
    ],
  },
  {
    value: 'HYDRAULIC_HOSE_REPAIR',
    slug: 'hydraulic-hose-repair',
    label: 'Mobile Hydraulic Hose Repair',
    shortLabel: 'Hydraulic Hose Repair',
    pluralLabel: 'Hydraulic Hose Repair Providers',
    icon: '🧰',
    desc: 'On-site hydraulic hose repair & replacement',
    issueTypes: [
      'Blown Hydraulic Hose',
      'Leaking Hydraulic Line',
      'Hydraulic Fitting Repair',
      'Hydraulic Cylinder Issue',
      'Mobile Hose Replacement',
      'Heavy Equipment Hydraulic Repair',
      'Industrial Hydraulic Repair',
      'Other',
    ],
    alternativeLabels: [
      'Hydraulic Hose Service',
      'Hydraulic Hose Repair',
      'Mobile Hydraulic Repair',
      'On-Site Hydraulic Hose Repair',
      'Hydraulic Line Repair',
    ],
  },
] as const

export type ProviderCategoryDefinition = (typeof PROVIDER_CATEGORY_DEFINITIONS)[number]
export type ProviderCategoryValue = ProviderCategoryDefinition['value']
export type ProviderCategorySlug = ProviderCategoryDefinition['slug']

export const VALID_PROVIDER_CATEGORIES = PROVIDER_CATEGORY_DEFINITIONS.map(
  (category) => category.value
) as readonly ProviderCategoryValue[]

export const PROVIDER_CATEGORIES = PROVIDER_CATEGORY_DEFINITIONS.map(
  ({ value, slug, label, shortLabel, pluralLabel, icon, desc }) => ({
    value,
    slug,
    label,
    shortLabel,
    pluralLabel,
    icon,
    desc,
  })
)

const CATEGORY_BY_VALUE = Object.fromEntries(
  PROVIDER_CATEGORY_DEFINITIONS.map((category) => [category.value, category])
) as Record<ProviderCategoryValue, ProviderCategoryDefinition>

const CATEGORY_BY_SLUG = Object.fromEntries(
  PROVIDER_CATEGORY_DEFINITIONS.map((category) => [category.slug, category])
) as Record<ProviderCategorySlug, ProviderCategoryDefinition>

export const ISSUE_TYPES_BY_CATEGORY = PROVIDER_CATEGORY_DEFINITIONS.reduce<
  Record<ProviderCategoryValue, readonly string[]>
>((acc, category) => {
  acc[category.value] = category.issueTypes
  return acc
}, {} as Record<ProviderCategoryValue, readonly string[]>)

export function getProviderCategoryDefinition(
  value: string | null | undefined
): ProviderCategoryDefinition | undefined {
  if (!value) return undefined
  return (
    CATEGORY_BY_VALUE[value as ProviderCategoryValue] ??
    CATEGORY_BY_SLUG[value as ProviderCategorySlug]
  )
}

export function parseProviderCategoryInput(value: unknown): ProviderCategoryValue | undefined {
  if (typeof value !== 'string') return undefined
  return getProviderCategoryDefinition(value)?.value
}

export function parseProviderCategory(value: unknown): ProviderCategoryValue {
  return parseProviderCategoryInput(value) ?? 'DIESEL_MECHANIC'
}

export function providerCategoryToSlug(value: ProviderCategoryValue): ProviderCategorySlug {
  return CATEGORY_BY_VALUE[value].slug
}
