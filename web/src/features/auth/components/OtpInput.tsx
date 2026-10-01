import type { ClipboardEvent, KeyboardEvent } from 'react'
import { useRef } from 'react'

import { cn } from '@/utils/cn'

export interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  error?: boolean
}

/** Segmented one-time-code input with auto-advance, backspace, and paste support. */
export function OtpInput({ length = 6, value, onChange, error = false }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = Array.from({ length }, (_, i) => value[i] ?? '')

  function setDigit(index: number, digit: string) {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join(''))
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1)
    setDigit(index, digit)
    if (digit && index < length - 1) inputRefs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    onChange(pasted.padEnd(digits.length, '').slice(0, length))
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex items-center justify-center gap-space-xs sm:gap-space-sm">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el
          }}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          inputMode="numeric"
          maxLength={1}
          aria-label={`Digit ${index + 1}`}
          className={cn(
            'h-14 w-11 rounded-lg bg-surface-container-low text-center text-headline-md text-on-surface outline-none transition-all duration-150 sm:h-16 sm:w-12',
            'focus:bg-surface-container-lowest focus:shadow-md',
            error && 'bg-error-container/40',
          )}
        />
      ))}
    </div>
  )
}
