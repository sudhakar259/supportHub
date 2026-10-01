import type { ForgotPasswordPayload, LoginCredentials, ResetPasswordPayload } from '@/features/auth/types'
import { apiFetch } from '@/services/api/client'
import type { RawUser } from '@/services/api/mappers'
import { mapUser } from '@/services/api/mappers'
import type { User } from '@/types/user'

interface LoginResponse {
  user: RawUser
  token: string
  token_type: string
}

/**
 * Auth endpoints. Maps 1:1 to api/routes/api/auth.php — see
 * api/app/Http/Controllers/Api/V1/AuthController.php for the exact contract.
 */
export const authApi = {
  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
        device_name: credentials.deviceName ?? 'web-browser',
      },
    })
    return { user: mapUser(result.user), token: result.token }
  },

  async logout(): Promise<void> {
    await apiFetch<null>('/auth/logout', { method: 'POST' })
  },

  async me(): Promise<User> {
    const raw = await apiFetch<RawUser>('/auth/me')
    return mapUser(raw)
  },

  async forgotPassword(payload: ForgotPasswordPayload): Promise<void> {
    await apiFetch<null>('/auth/forgot-password', { method: 'POST', body: payload })
  },

  async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await apiFetch<null>('/auth/reset-password', {
      method: 'POST',
      body: {
        token: payload.token,
        email: payload.email,
        password: payload.password,
        password_confirmation: payload.passwordConfirmation,
      },
    })
  },

  async resendVerification(): Promise<void> {
    await apiFetch<null>('/auth/email/verification-notification', { method: 'POST' })
  },
}
