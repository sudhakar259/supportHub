import { Modal } from '@/components/ui/Modal'
import { formatDateTime } from '@/utils/datetime'
import type { AuditLog } from '@/types/auditLog'

export interface AuditLogDetailModalProps {
  log: AuditLog | null
  onClose: () => void
}

function JsonBlock({ title, value }: { title: string; value: Record<string, unknown> | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-sm uppercase tracking-wider text-secondary">{title}</span>
      <pre className="max-h-64 overflow-auto rounded-lg bg-inverse-surface p-space-sm font-code-sm text-code-sm text-inverse-on-surface">
        {value ? JSON.stringify(value, null, 2) : '—'}
      </pre>
    </div>
  )
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  if (!log) return null

  return (
    <Modal isOpen={Boolean(log)} onClose={onClose} title={log.action} maxWidthClassName="max-w-2xl">
      <div className="flex flex-col gap-space-md">
        <div className="grid grid-cols-2 gap-space-sm text-body-sm">
          <div>
            <span className="text-label-sm text-secondary uppercase">Actor</span>
            <div className="text-on-surface">{log.actor?.name ?? log.actorType ?? 'System'}</div>
          </div>
          <div>
            <span className="text-label-sm text-secondary uppercase">Timestamp</span>
            <div className="text-on-surface">{log.createdAt ? formatDateTime(log.createdAt) : '—'}</div>
          </div>
          <div>
            <span className="text-label-sm text-secondary uppercase">Target</span>
            <div className="text-on-surface">
              {log.auditableType ? `${log.auditableType} #${log.auditableId}` : '—'}
            </div>
          </div>
          <div>
            <span className="text-label-sm text-secondary uppercase">IP Address</span>
            <div className="text-on-surface">{log.ipAddress ?? '—'}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-space-md sm:grid-cols-2">
          <JsonBlock title="Before" value={log.oldValues} />
          <JsonBlock title="After" value={log.newValues} />
        </div>
      </div>
    </Modal>
  )
}
