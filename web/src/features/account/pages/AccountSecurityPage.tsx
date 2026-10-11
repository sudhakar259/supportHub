import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { PasswordField } from '@/components/ui/PasswordField'
import { TextField } from '@/components/ui/TextField'
import { RecoveryCodes } from '@/features/account/components/RecoveryCodes'
import { authApi } from '@/features/auth/api/authApi'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { ApiError } from '@/types/api'

type Step =
  | { name: 'idle' }
  | { name: 'password' }
  | { name: 'scan'; secret: string; otpauthUrl: string }
  | { name: 'codes'; codes: string[] }
  | { name: 'disable' }
  | { name: 'regenerate' }

function messageOf(err: unknown, fields: string[]): string {
  if (err instanceof ApiError) return fields.map((f) => err.fieldError(f)).find(Boolean) ?? err.message
  return 'Unable to reach the server. Please try again.'
}

/** Where a person turns two-step verification (an authenticator app) on or off and manages their recovery codes. */
export function AccountSecurityPage() {
  const toast = useToast()
  const { user, setUser } = useAuth()
  const [step, setStep] = useState<Step>({ name: 'idle' })
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  const enabled = user?.twoFactorEnabled === true

  useEffect(() => {
    if (step.name !== 'scan') {
      setQr(null)
      return
    }
    QRCode.toDataURL(step.otpauthUrl, { width: 200, margin: 1 }).then(setQr).catch(() => setQr(null))
  }, [step])

  function reset(next: Step = { name: 'idle' }) {
    setStep(next)
    setPassword('')
    setCode('')
    setError(null)
  }

  async function refreshUser() {
    setUser(await authApi.me())
  }

  async function run(action: () => Promise<void>, fields: string[]) {
    setIsBusy(true)
    setError(null)
    try {
      await action()
    } catch (err) {
      setError(messageOf(err, fields))
    } finally {
      setIsBusy(false)
    }
  }

  const startSetup = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const { secret, otpauthUrl } = await authApi.twoFactorSetup(password)
      reset({ name: 'scan', secret, otpauthUrl })
    }, ['password'])
  }

  const confirmSetup = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const codes = await authApi.twoFactorConfirm(code)
      await refreshUser()
      reset({ name: 'codes', codes })
    }, ['code'])
  }

  const disable = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const looksLikeRecovery = code.includes('-')
      await authApi.twoFactorDisable({ password, code: looksLikeRecovery ? undefined : code, recoveryCode: looksLikeRecovery ? code : undefined })
      await refreshUser()
      toast.success('Two-step verification is off')
      reset()
    }, ['password', 'code', 'recovery_code'])
  }

  const regenerate = (e: FormEvent) => {
    e.preventDefault()
    void run(async () => {
      const codes = await authApi.twoFactorRegenerateCodes({ password, code })
      await refreshUser()
      reset({ name: 'codes', codes })
    }, ['password', 'code'])
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Account' }, { label: 'Security' }]} title="Account security" />

      <div className="flex max-w-2xl flex-col gap-space-md px-gutter-lg">
        <section className="flex flex-col gap-space-md rounded-xl bg-surface-container-lowest p-space-lg shadow-sm" aria-labelledby="two-step-title">
          <div className="flex flex-wrap items-start justify-between gap-space-md">
            <div className="flex items-start gap-space-md">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary">
                <Icon name="phonelink_lock" size={22} />
              </span>
              <div>
                <h2 id="two-step-title" className="text-title-md font-bold text-on-surface">
                  Two-step verification
                </h2>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  Adds a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy) to your password, so a stolen password alone is not enough to sign in.
                </p>
              </div>
            </div>
            <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'On' : 'Off'}</Badge>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-error-container p-space-md text-body-sm text-on-error-container">
              {error}
            </p>
          )}

          {step.name === 'idle' && !enabled && (
            <div>
              <Button leadingIcon="shield" onClick={() => reset({ name: 'password' })}>
                Turn on
              </Button>
            </div>
          )}

          {step.name === 'idle' && enabled && (
            <div className="flex flex-col gap-space-sm">
              <p className="text-body-sm text-on-surface-variant">
                You have <strong>{user?.twoFactorRecoveryCodesRemaining ?? 0}</strong> unused recovery code{user?.twoFactorRecoveryCodesRemaining === 1 ? '' : 's'}.
              </p>
              <div className="flex flex-wrap gap-space-sm">
                <Button variant="secondary" leadingIcon="autorenew" onClick={() => reset({ name: 'regenerate' })}>
                  Get new recovery codes
                </Button>
                <Button variant="secondary" leadingIcon="shield_locked" onClick={() => reset({ name: 'disable' })}>
                  Turn off
                </Button>
              </div>
            </div>
          )}

          {step.name === 'password' && (
            <form onSubmit={startSetup} className="flex flex-col gap-space-md">
              <p className="text-body-sm text-on-surface-variant">First, confirm it is you by entering your password.</p>
              <PasswordField label="Current password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
              <div className="flex gap-space-sm">
                <Button type="submit" isLoading={isBusy} disabled={!password}>
                  Continue
                </Button>
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {step.name === 'scan' && (
            <form onSubmit={confirmSetup} className="flex flex-col gap-space-md">
              <ol className="list-decimal space-y-space-xs pl-5 text-body-sm text-on-surface-variant">
                <li>Open your authenticator app and add an account by scanning this code.</li>
                <li>Type the 6-digit code it shows to finish.</li>
              </ol>
              <div className="flex flex-wrap items-center gap-space-lg">
                {qr ? (
                  <img src={qr} alt="QR code to scan with your authenticator app" width={200} height={200} className="rounded-lg bg-white p-1 shadow-sm" />
                ) : (
                  <div className="h-[200px] w-[200px] animate-pulse rounded-lg bg-surface-container" />
                )}
                <div className="flex flex-col gap-1">
                  <span className="text-label-md uppercase tracking-wider text-secondary">Can’t scan? Enter this key</span>
                  <code className="break-all rounded bg-surface-container px-3 py-1.5 text-code-sm text-on-surface">{step.secret}</code>
                </div>
              </div>
              <TextField
                label="6-digit code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={7}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9 ]/g, ''))}
                autoFocus
              />
              <div className="flex gap-space-sm">
                <Button type="submit" isLoading={isBusy} disabled={code.replace(/\s/g, '').length !== 6}>
                  Turn on
                </Button>
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {step.name === 'codes' && <RecoveryCodes codes={step.codes} onDone={() => reset()} />}

          {(step.name === 'disable' || step.name === 'regenerate') && (
            <form onSubmit={step.name === 'disable' ? disable : regenerate} className="flex flex-col gap-space-md">
              <p className="text-body-sm text-on-surface-variant">
                {step.name === 'disable'
                  ? 'Enter your password and a current code (or a recovery code) to turn two-step verification off.'
                  : 'Enter your password and a current code. Your old recovery codes will stop working.'}
              </p>
              <PasswordField label="Current password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
              <TextField
                label={step.name === 'disable' ? 'Authenticator code or recovery code' : '6-digit code'}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="flex gap-space-sm">
                <Button type="submit" isLoading={isBusy} disabled={!password || !code}>
                  {step.name === 'disable' ? 'Turn off' : 'Get new codes'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => reset()}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
