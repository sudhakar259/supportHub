/** Frames the supplied transparent artwork without its surrounding canvas padding. */
export function BrandMark({ size = 24, variant = 'mark' }: { size?: number; variant?: 'mark' | 'icon' }) {
  return (
    <svg width={size} height={size} viewBox={variant === 'icon' ? '16 16 168 168' : '49 45 101 116'} aria-hidden="true" focusable="false" className="shrink-0">
      <image href={variant === 'icon' ? '/favicon.png' : '/branding/deskNu-logo.png'} width="200" height="184" />
    </svg>
  )
}
