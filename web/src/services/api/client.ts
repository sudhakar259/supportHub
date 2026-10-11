import { ROUTES } from '@/app/router/routes'
import { env } from '@/app/config/env'
import { tokenStorage } from '@/services/storage/tokenStorage'
import { workspaceHeaders } from '@/features/workspaces/workspace'
import { ApiError } from '@/types/api'
import type { ApiEnvelope } from '@/types/api'
import type { Paginated, PaginationMeta } from '@/types/pagination'

/**
 * Lazily imported so this module-level service file doesn't eagerly pull in
 * the whole router/page graph (router.tsx imports every page component,
 * which import this client back) — only resolved the first time a 401
 * actually needs to redirect.
 */
let routerModulePromise: Promise<typeof import('@/app/router/router')> | null = null
function getRouter() {
  routerModulePromise ??= import('@/app/router/router')
  return routerModulePromise
}

const SESSION_EXPIRY_EXEMPT_PATHS: readonly string[] = [
  ROUTES.login,
  ROUTES.sessionExpired,
  ROUTES.forgotPassword,
  ROUTES.resetPassword,
  ROUTES.setPassword,
]

/**
 * No global 401 handling previously existed (QA finding, 2026-10-01): a
 * token that expired or was revoked mid-session left the user silently
 * "logged in" in AuthContext while every subsequent call quietly failed
 * wherever (or if) the calling component happened to catch it. This clears
 * the dead token and routes to the already-built-but-unreachable
 * SessionExpiredPage, which re-authenticates and returns the user to where
 * they were.
 */
function handleUnauthorized(): void {
  if (SESSION_EXPIRY_EXEMPT_PATHS.includes(window.location.pathname)) return

  tokenStorage.clear()

  void getRouter().then(({ router }) => {
    router.navigate(ROUTES.sessionExpired, {
      state: { from: window.location.pathname + window.location.search },
    })
  })
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

interface RawPaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
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

async function request<T>(path: string, options: RequestOptions): Promise<ApiEnvelope<T>> {
  const { method = 'GET', body, params, signal } = options
  const token = tokenStorage.get()

  // A FormData body (file uploads) must be sent as-is: the browser sets the
  // multipart Content-Type and boundary itself, so we must not set one.
  const isForm = body instanceof FormData

  const response = await fetch(buildUrl(path, params), {
    method,
    headers: {
      Accept: 'application/json',
      ...workspaceHeaders(),
      ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    signal,
  })

  const isJson = response.headers.get('content-type')?.includes('application/json')
  const payload = isJson ? ((await response.json()) as ApiEnvelope<T>) : null

  if (response.status === 401) {
    handleUnauthorized()
  }

  if (!response.ok || !payload) {
    throw new ApiError(
      payload?.message ?? `Request failed with status ${response.status}`,
      response.status,
      (payload as unknown as { errors?: Record<string, string[]> } | null)?.errors,
    )
  }

  return payload
}

/**
 * Thin fetch wrapper for the Laravel API. Every component/hook goes through this
 * (never calls `fetch` directly), so swapping transport, auth, or base URL later
 * only touches this one file — see architecture note in AGENTS/spec section 39.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const payload = await request<T>(path, options)
  return payload.data
}

/** Like apiFetch, but also returns the paginator meta Laravel attaches to list endpoints. */
export async function apiFetchPage<TRaw, TMapped>(
  path: string,
  mapItem: (raw: TRaw) => TMapped,
  options: RequestOptions = {},
): Promise<Paginated<TMapped>> {
  const payload = await request<TRaw[]>(path, options)
  const rawMeta = payload.meta as unknown as RawPaginationMeta | undefined

  const meta: PaginationMeta = rawMeta
    ? {
        currentPage: rawMeta.current_page,
        lastPage: rawMeta.last_page,
        perPage: rawMeta.per_page,
        total: rawMeta.total,
      }
    : { currentPage: 1, lastPage: 1, perPage: payload.data.length, total: payload.data.length }

  return { items: payload.data.map(mapItem), meta }
}

/**
 * Fetches a protected file (attachment download) with the signed-in user's
 * token. A plain <a href> cannot do this: the browser would not send the
 * Authorization header, so the API would answer 401.
 */
export async function apiFetchBlob(url: string): Promise<Blob> {
  const token = tokenStorage.get()
  const response = await fetch(url, {
    headers: { Accept: '*/*', ...workspaceHeaders(), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })

  if (response.status === 401) handleUnauthorized()

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch {
      /* not JSON — keep the generic message */
    }
    throw new ApiError(message, response.status)
  }

  return response.blob()
}

/**
 * Downloads a file the API generates (CSV export, data export) using the signed-in
 * session, then hands it to the browser as a normal file save. The name comes from the
 * server's Content-Disposition header when the browser lets us read it.
 */
export async function apiDownloadFile(path: string, fallbackName: string, params?: RequestOptions['params']): Promise<void> {
  const token = tokenStorage.get()
  const response = await fetch(buildUrl(path, params), {
    headers: { Accept: '*/*', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })

  if (response.status === 401) handleUnauthorized()

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch {
      /* not JSON — keep the generic message */
    }
    throw new ApiError(message, response.status)
  }

  const disposition = response.headers.get('content-disposition') ?? ''
  const filename = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)?.[1] ?? fallbackName

  const objectUrl = URL.createObjectURL(await response.blob())
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = decodeURIComponent(filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
