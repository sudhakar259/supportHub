/** Standard envelope every Laravel API endpoint responds with (see api/app/Http/Concerns/ApiResponse.php). */
export interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: Record<string, unknown>
  links?: Record<string, unknown>
}

export type ValidationErrors = Record<string, string[]>

export class ApiError extends Error {
  status: number
  errors?: ValidationErrors

  constructor(message: string, status: number, errors?: ValidationErrors) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** First error message for a given field, if the API returned field-level validation errors. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0]
  }
}
