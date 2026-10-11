/**
 * Mirrors api/config/attachments.php — the server enforces these limits; the
 * client checks them first only so people get an instant, readable message
 * instead of a failed upload.
 */
export const ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024
export const ATTACHMENT_MAX_PER_MESSAGE = 5
export const ATTACHMENT_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'txt', 'pdf', 'docx', 'ppt', 'pptx'] as const

/** Value for <input accept="…">. */
export const ATTACHMENT_ACCEPT = ATTACHMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export const ATTACHMENT_HELP = `JPG, PNG, WebP, TXT, PDF, DOCX, PPT or PPTX, up to 2 MB each (max ${ATTACHMENT_MAX_PER_MESSAGE} files)`

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface AttachmentCheck {
  accepted: File[]
  errors: string[]
}

/** Splits newly chosen files into those we can send and human-readable reasons for the rest. */
export function checkAttachments(existing: File[], incoming: File[]): AttachmentCheck {
  const accepted: File[] = []
  const errors: string[] = []

  for (const file of incoming) {
    const extension = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : ''

    if (!(ATTACHMENT_EXTENSIONS as readonly string[]).includes(extension)) {
      errors.push(`“${file.name}” is not an allowed file type.`)
    } else if (file.size > ATTACHMENT_MAX_BYTES) {
      errors.push(`“${file.name}” is ${formatFileSize(file.size)}; the limit is 2 MB.`)
    } else if (existing.length + accepted.length >= ATTACHMENT_MAX_PER_MESSAGE) {
      errors.push(`You can attach at most ${ATTACHMENT_MAX_PER_MESSAGE} files.`)
    } else {
      accepted.push(file)
    }
  }

  return { accepted, errors }
}
