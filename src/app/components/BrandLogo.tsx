import Image from 'next/image'

type BrandLogoProps = {
  alt?: string
  variant?: 'header' | 'login'
  priority?: boolean
}

export default function BrandLogo({
  alt = 'DieselRepairFinder.com',
  variant = 'header',
  priority = false,
}: BrandLogoProps) {
  const imageWidthClassName =
    variant === 'login'
      ? 'w-[240px] h-28 sm:w-[320px] sm:h-36'
      : 'w-[170px] h-20 sm:w-[220px] sm:h-24 lg:w-[240px] lg:h-24'
  const containerClassName = 'overflow-hidden rounded-xl bg-white'
  const sizes =
    variant === 'login'
      ? '(min-width: 640px) 320px, 240px'
      : '(min-width: 1024px) 240px, (min-width: 640px) 220px, 170px'

  return (
    <span className={`inline-flex items-center justify-center ${containerClassName}`}>
      <Image
        src="/diesel-repair-finder-logo.png"
        alt={alt}
        width={1536}
        height={1024}
        sizes={sizes}
        priority={priority}
        className={`h-full w-full object-contain ${imageWidthClassName}`}
      />
    </span>
  )
}
