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
