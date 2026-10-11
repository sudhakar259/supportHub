import { BrandMark } from '@/components/ui/BrandMark'
import { cn } from '@/utils/cn'

/** The DeskZeal mark and wordmark: `tone="dark"` is for dark backgrounds and uses the dark artwork. */
export function BrandLogo({ tone = 'light', size = 24, className }: { tone?: 'light' | 'dark'; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-2 whitespace-nowrap font-display font-bold tracking-tight', tone === 'dark' ? 'text-white' : 'text-on-surface', className)} style={{ fontSize: size, lineHeight: 1 }}>
      <BrandMark size={Math.round(size * 1.4)} tone={tone} />
      <span>Desk<span style={{ color: tone === 'dark' ? '#ea580c' : '#a33900' }}>Zeal</span>.</span>
    </span>
  )
}
