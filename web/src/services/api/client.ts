import { env } from '@/app/config/env'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { ApiError } from '@/types/api'
import type { ApiEnvelope } from '@/types/api'

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${env.apiUrl}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

/**
 * Thin fetch wrapper for the Laravel API. Every component/hook goes through this
 * (never calls `fetch` directly), so swapping transport, auth, or base URL later
 * only touches this one file — see architecture note in AGENTS/spec section 39.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal } = options
  const token = tokenStorage.get()

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? ((await response.json()) as ApiEnvelope<T>) : null

  if (!response.ok || !payload) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      (payload as unknown as { errors?: Record<string, string[]> } | null)?.errors,
    )
  }

  return payload.data
}
