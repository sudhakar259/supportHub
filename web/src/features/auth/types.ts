export interface LoginCredentials {
  email: string
  password: string
  deviceName?: string
}

export interface ForgotPasswordPayload {
  email: string
}

export interface ResetPasswordPayload {
  token: string
  email: string
  password: string
  passwordConfirmation: string
}
