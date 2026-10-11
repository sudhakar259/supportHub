import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { tokenStorage } from '@/services/storage/tokenStorage'
import { developerDocsApi } from './developerDocsApi'

vi.mock('@/app/config/env', () => ({ env: { apiUrl: 'https://api.example.test/api/v1' } }))
vi.mock('@/features/workspaces/workspace', () => ({ workspaceHeaders: () => ({ 'X-Workspace': 'acme' }) }))

describe('authenticated documentation transport', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    tokenStorage.set('test-session-token')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends the session and workspace when reading documentation', async () => {
    const data = { guide: '# Private guide', reference: [], baseUrl: 'https://api.example.test' }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: true, data }), { headers: { 'Content-Type': 'application/json' } }))

    expect(await developerDocsApi.get()).toEqual(data)
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/api/v1/developer-docs', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-session-token', 'X-Workspace': 'acme' }),
    }))
  })

  it.each(['openapi', 'postman'] as const)('sends authenticated headers when downloading %s', async (format) => {
    fetchMock.mockResolvedValue(new Response('private export'))
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn().mockReturnValue('blob:private-download')
      static revokeObjectURL = vi.fn()
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await developerDocsApi.download(format)

    expect(fetchMock).toHaveBeenCalledWith(`https://api.example.test/api/v1/developer-docs/${format}`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-session-token', 'X-Workspace': 'acme' }),
    }))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-download')
  })
})
