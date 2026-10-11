import { useState } from 'react'

import { useToast } from '@/components/feedback/ToastProvider'
import { Button } from '@/components/ui/Button'
import { reportsApi } from '@/features/reports/api/reportsApi'

/** Downloads the tickets you can see as a CSV, optionally between two creation dates. */
export function TicketsCsvExport() {
  const toast = useToast()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isExporting, setIsExporting] = useState(false)

  async function download() {
    setIsExporting(true)
    try {
      await reportsApi.exportTicketsCsv({ from, to })
    } catch (err) {
      toast.error('Export Failed', err instanceof Error ? err.message : undefined)
    } finally {
      setIsExporting(false)
    }
  }

  const input = 'h-9 rounded-lg bg-surface-container-low px-space-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="flex flex-wrap items-end gap-space-sm">
      <label className="flex flex-col gap-0.5 text-label-sm text-secondary">
        From
        <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={input} />
      </label>
      <label className="flex flex-col gap-0.5 text-label-sm text-secondary">
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={input} />
      </label>
      <Button variant="secondary" leadingIcon="download" isLoading={isExporting} onClick={download}>
        Export tickets (CSV)
      </Button>
    </div>
  )
}
