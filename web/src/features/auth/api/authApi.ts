import type { ForgotPasswordPayload, LoginCredentials, ResetPasswordPayload, TwoFactorChallengePayload } from '@/features/auth/types'
import { apiFetch } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'
import type { User } from '@/types/user'

interface LoginResponse {
  user: RawUser
  token: string
  token_type: string
}

/** The login endpoint answers with either a session or, for accounts with two-factor on, a challenge. */
interface LoginOrChallengeResponse extends Partial<LoginResponse> {
  two_factor_required?: boolean
  challenge_token?: string
}

/**
 * Auth endpoints. Maps 1:1 to api/routes/api/auth.php — see
 * api/app/Http/Controllers/Api/V1/AuthController.php for the exact contract.
 */
export const authApi = {
  async createWorkspaceHandoff(): Promise<string> {
    const result = await apiFetch<{ code: string }>('/auth/workspace-handoff', { method: 'POST' })
    return result.code
  },

  async exchangeWorkspaceSession(code: string): Promise<{ user: User; token: string }> {
    const result = await apiFetch<LoginResponse>('/auth/workspace-session', { method: 'POST', body: { code } })
    return { user: mapUser(result.user), token: result.token }
  },

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string } | { challengeToken: string }> {
    const result = await apiFetch<LoginOrChallengeResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        tenant: credentials.tenant?.trim() || undefined,
        device_name: credentials.deviceName ?? 'web-browser',
      },
    })

    if (result.two_factor_required && result.challenge_token) return { challengeToken: result.challenge_token }

    return { user: mapUser(result.user as RawUser), token: result.token as string }
  },

  /** Second step of sign-in for accounts with two-factor authentication on. */
  async twoFactorChallenge(payload: TwoFactorChallengePayload): Promise<{ user: User; token: string }> {
    const result = await apiFetch<LoginResponse>('/auth/two-factor/challenge', {
      method: 'POST',
      body: { challenge_token: payload.challengeToken, code: payload.code, recovery_code: payload.recoveryCode },
    })
    return { user: mapUser(result.user), token: result.token }
  },

  /** Step 1 of turning two-factor on: returns the secret and the link for the QR code. */
  async twoFactorSetup(password: string): Promise<{ secret: string; otpauthUrl: string }> {
    const result = await apiFetch<{ secret: string; otpauth_url: string }>('/auth/two-factor/setup', { method: 'POST', body: { password } })
    return { secret: result.secret, otpauthUrl: result.otpauth_url }
  },

  /** Step 2: a code from the app turns it on. Returns the recovery codes, shown only this once. */
  async twoFactorConfirm(code: string): Promise<string[]> {
    const result = await apiFetch<{ recovery_codes: string[] }>('/auth/two-factor/confirm', { method: 'POST', body: { code } })
    return result.recovery_codes
  },

  async twoFactorDisable(payload: { password: string; code?: string; recoveryCode?: string }): Promise<void> {
    await apiFetch<null>('/auth/two-factor/disable', {
      method: 'POST',
      body: { password: payload.password, code: payload.code, recovery_code: payload.recoveryCode },
    })
  },

  async twoFactorRegenerateCodes(payload: { password: string; code: string }): Promise<string[]> {
    const result = await apiFetch<{ recovery_codes: string[] }>('/auth/two-factor/recovery-codes', { method: 'POST', body: payload })
    return result.recovery_codes
  },

  async logout(): Promise<void> {
    await apiFetch<null>('/auth/logout', { method: 'POST' })
  },

  async me(): Promise<User> {
    const raw = await apiFetch<RawUser>('/auth/me')
    return mapUser(raw)
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiFetch<null>('/auth/forgot-password', {
      method: 'POST',
      body: { email: payload.email, tenant: payload.tenant?.trim() || undefined },
    })
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiFetch<null>('/auth/reset-password', {
      method: 'POST',
      body: {
        token: payload.token,
        email: payload.email,
        tenant: payload.tenant?.trim() || undefined,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      },
    })
  },

  async resendVerification(): Promise<void> {
    await apiFetch<null>('/auth/email/verification-notification', { method: 'POST' })
  },
}
