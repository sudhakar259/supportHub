import type { User } from '@/types/user'

export interface LoginCredentials {
  email: string
  password: string
  /** Organization slug — only required when the email is registered under more than one tenant. */
  tenant?: string
  deviceName?: string
}

export interface ForgotPasswordPayload {
  email: string
  tenant?: string
}

export interface ResetPasswordPayload {
  token: string
  email: string
  tenant?: string
  password: string
  passwordConfirmation: string
}

/** What signing in produced: a session, or a request for the authenticator code. */
export type LoginResult = { status: 'authenticated'; user: User } | { status: 'two_factor'; challengeToken: string }

export interface TwoFactorChallengePayload {
  challengeToken: string
  /** The 6-digit code from the authenticator app. */
  code?: string
  /** One of the saved recovery codes, instead of `code`. */
  recoveryCode?: string
}
