import { apiDownloadFile, apiFetch } from '@/services/api/client'

export interface ReferenceRequest {
  method: string
  url: string | { raw: string; path?: string; query?: { key: string; value: string; description?: string; disabled?: boolean }[] }
  description?: string
  header?: { key: string; value: string; description?: string; disabled?: boolean }[]
  auth?: { type: string }
  body?: { mode: string; raw?: string; formdata?: { key: string; value?: string; type?: string; description?: string; disabled?: boolean }[] }
}

export interface ReferenceItem {
  name: string
  description?: string
  item?: ReferenceItem[]
  request?: ReferenceRequest
  response?: { code: number; body: string | null; name?: string }[]
}

export interface DeveloperDocumentation {
  guide: string
  reference: ReferenceItem[]
  baseUrl: string
}

export const developerDocsApi = {
  get(signal?: AbortSignal) {
    return apiFetch<DeveloperDocumentation>('/developer-docs', { signal })
  },
  download(format: 'openapi' | 'postman') {
    return apiDownloadFile(`/developer-docs/${format}`, format === 'openapi' ? 'openapi.yaml' : 'collection.json')
  },
}
