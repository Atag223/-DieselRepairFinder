import Image from 'next/image'

type BrandLogoProps = {
  alt?: string
  variant?: 'header' | 'login' | 'footer'
  priority?: boolean
}

export default function BrandLogo({
  alt = 'DieselRepairFinder.com',
  variant = 'header',
  priority = false,
}: BrandLogoProps) {
  const imageWidthClassName =
    variant === 'login'
      ? 'w-[220px] sm:w-[280px]'
      : variant === 'footer'
        ? 'w-[150px] sm:w-[170px]'
        : 'w-[170px] sm:w-[200px] lg:w-[220px]'
  const containerClassName =
    variant === 'login'
      ? 'rounded-xl bg-white px-2 py-2'
      : variant === 'footer'
        ? 'rounded-xl bg-white px-1.5 py-1'
        : 'rounded-xl bg-white px-1.5 py-1'
  const sizes =
    variant === 'login'
      ? '(min-width: 640px) 280px, 220px'
      : variant === 'footer'
        ? '(min-width: 640px) 170px, 150px'
        : '(min-width: 1024px) 220px, (min-width: 640px) 200px, 170px'

  return (
    <span className={`inline-flex items-center justify-center ${containerClassName}`}>
      <Image
        src="/diesel-repair-finder-logo.png"
        alt={alt}
        width={1536}
        height={1024}
        sizes={sizes}
        priority={priority}
        className={`h-auto object-contain ${imageWidthClassName}`}
      />
    </span>
  )
}
