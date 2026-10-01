import { useState } from 'react'

import { Icon } from '@/components/ui/Icon'
import { TextField } from '@/components/ui/TextField'
import type { TextFieldProps } from '@/components/ui/TextField'

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailingSlot'>

/** TextField with a show/hide toggle, used across login, reset, and set-password flows. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailingSlot={
        <button
          type="button"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
          className="text-secondary hover:text-on-surface transition-colors"
        >
          <Icon name={visible ? 'visibility_off' : 'visibility'} size={18} />
        </button>
      }
    />
  )
}
