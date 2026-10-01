import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidthClassName?: string
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidthClassName = 'max-w-lg' }: ModalProps) {
  const titleId = useId()

  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-inverse-surface/65 p-gutter-lg backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn('my-auto flex w-full flex-col overflow-hidden rounded-xl bg-surface-container-lowest shadow-2xl', maxWidthClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-gradient-to-r from-primary to-primary-container" />
        <div className="flex items-center justify-between border-b border-surface-container-high px-space-lg py-space-md">
          <h2 id={titleId} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>
        <div className="p-space-lg">{children}</div>
        {footer && <div className="flex items-center justify-end gap-space-sm border-t border-surface-container-high bg-surface-container-low px-space-lg py-space-md">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}
