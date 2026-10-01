import { cn } from '@/utils/cn'

const PALETTE = [
  'bg-primary text-on-primary',
  'bg-secondary text-on-secondary',
  'bg-tertiary text-on-tertiary',
  'bg-secondary-fixed text-on-secondary-fixed',
  'bg-primary-fixed text-on-primary-fixed',
]

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function paletteIndex(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return hash % PALETTE.length
}

export interface AvatarProps {
  name: string
  src?: string | null
  size?: number
  className?: string
}

/** Circular avatar: renders a photo when available, otherwise a color-coded initials chip. */
export function Avatar({ name, src, size = 32, className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold',
        PALETTE[paletteIndex(name)],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
      title={name}
    >
      {initialsOf(name) || '?'}
    </div>
  )
}
