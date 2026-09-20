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
    variant === 'login' ? 'w-[220px] sm:w-[260px]' : 'w-[154px] sm:w-[220px] lg:w-[240px]'
  const containerClassName = variant === 'login' ? 'px-4 py-3' : 'px-2 py-1.5 sm:px-3'
  const sizes =
    variant === 'login' ? '(min-width: 640px) 260px, 220px' : '(min-width: 1024px) 240px, (min-width: 640px) 220px, 154px'

  return (
    <span className={`inline-flex items-center rounded-xl bg-white ${containerClassName}`}>
      <Image
        src="/diesel-repair-finder-logo.png"
        alt={alt}
        width={1040}
        height={240}
        sizes={sizes}
        priority={priority}
        className={`h-auto object-contain ${imageWidthClassName}`}
      />
    </span>
  )
}
