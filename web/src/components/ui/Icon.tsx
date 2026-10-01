import { cn } from '@/utils/cn'

export interface IconProps {
  /** Material Symbols Outlined glyph name, e.g. "search", "check_circle". */
  name: string
  className?: string
  size?: number
  /** Use the filled variant of the glyph. */
  filled?: boolean
}

/** Renders a Material Symbols Outlined glyph — the icon system used throughout the Stitch designs. */
export function Icon({ name, className, size = 20, filled = false }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined select-none', className)}
      style={{
        fontSize: size,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
