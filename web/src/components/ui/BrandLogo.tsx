import { BrandMark } from '@/components/ui/BrandMark'
import { cn } from '@/utils/cn'

/** Uses the supplied mark with the light/dark wordmark treatment from design/logo. */
export function BrandLogo({ tone = 'light', size = 24, className }: { tone?: 'light' | 'dark'; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-display font-bold tracking-tight', tone === 'dark' ? 'text-white' : 'text-on-surface', className)} style={{ fontSize: size, lineHeight: 1 }}>
      <BrandMark size={Math.round(size * 1.4)} />
      <span>Desk<span style={{ color: tone === 'dark' ? '#ea580c' : '#a33900' }}>Nu</span>.</span>
    </span>
  )
}
