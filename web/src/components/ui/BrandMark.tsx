/**
 * The DeskZeal mark. `tone="light"` is the default artwork for light backgrounds;
 * `tone="dark"` is the variant for dark backgrounds (sidebar, footer, dark mode).
 * The files are trimmed to the artwork, so the width follows from the height.
 */
const MARK = {
  light: { src: '/branding/deskzeal-logo.png', ratio: 123 / 114 },
  dark: { src: '/branding/deskzeal-dark.png', ratio: 103 / 97 },
}

export function BrandMark({ size = 24, variant = 'mark', tone = 'light' }: { size?: number; variant?: 'mark' | 'icon'; tone?: 'light' | 'dark' }) {
  if (variant === 'icon') return <img src="/favicon.png" alt="" aria-hidden="true" width={size} height={size} className="shrink-0 object-contain" />

  const { src, ratio } = MARK[tone]
  return <img src={src} alt="" aria-hidden="true" height={size} width={Math.round(size * ratio)} className="shrink-0 object-contain" />
}
