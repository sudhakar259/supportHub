import { useId, useRef, useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { ATTACHMENT_ACCEPT, ATTACHMENT_HELP, checkAttachments, formatFileSize } from '@/utils/attachments'

export interface AttachmentPickerProps {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}

/** File chooser with instant client-side checks (type, 2 MB, max 5) and removable chips. */
export function AttachmentPicker({ files, onChange, disabled = false }: AttachmentPickerProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<string[]>([])

  function handleChosen(list: FileList | null) {
    const { accepted, errors: problems } = checkAttachments(files, Array.from(list ?? []))
    setErrors(problems)
    if (accepted.length > 0) onChange([...files, ...accepted])
    // Reset so choosing the same file again after removing it still fires onChange.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <div className="flex flex-wrap items-center gap-space-sm">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={ATTACHMENT_ACCEPT}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => handleChosen(e.target.files)}
        />
        <label
          htmlFor={inputId}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-surface-container px-space-md text-title-sm text-on-surface transition-colors hover:bg-surface-container-high has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
        >
          <Icon name="attach_file" size={16} />
          Attach files
        </label>
        <span className="text-label-sm text-secondary">{ATTACHMENT_HELP}</span>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-space-xs" aria-label="Files to attach">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="inline-flex items-center gap-1.5 rounded bg-surface-container px-2.5 py-1 text-code-sm text-on-surface">
              <Icon name="description" size={16} className="text-primary" />
              <span className="max-w-[16rem] truncate">{file.name}</span>
              <span className="text-secondary">{formatFileSize(file.size)}</span>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="ml-0.5 text-secondary hover:text-error"
              >
                <Icon name="close" size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="flex flex-col gap-0.5 text-body-sm text-error">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
