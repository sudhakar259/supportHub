import { useEffect, useState } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { useToast } from '@/components/feedback/ToastProvider'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { developerDocsApi } from '@/features/integrations/api/developerDocsApi'
import type { DeveloperDocumentation, ReferenceItem } from '@/features/integrations/api/developerDocsApi'
import './developer-docs.css'

function headingId(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function shellQuote(value: string) {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function Endpoint({ endpoint, baseUrl }: { endpoint: ReferenceItem; baseUrl: string }) {
  const request = endpoint.request!
  const rawUrl = typeof request.url === 'string' ? request.url : request.url.raw
  const url = rawUrl.replaceAll('{{baseUrl}}', baseUrl)
  const path = typeof request.url === 'string' ? request.url : request.url.path || request.url.raw
  const headers = (request.header ?? []).filter((header) => !header.disabled)
  const keyAuth = headers.some((header) => header.key.toLowerCase() === 'x-api-key')
  const tokenAuth = request.auth?.type !== 'noauth' && !keyAuth
  const query = typeof request.url === 'string' ? [] : request.url.query ?? []
  const curl = [
    `curl --request ${request.method} ${shellQuote(url)}`,
    ...(tokenAuth ? ["  --header 'Authorization: Bearer <YOUR_SESSION_TOKEN>'"] : []),
    ...headers.map((header) => `  --header ${shellQuote(`${header.key}: ${header.value}`)}`),
    ...(request.body?.mode === 'raw' && request.body.raw ? [`  --data ${shellQuote(request.body.raw)}`] : []),
    ...(request.body?.mode === 'formdata' ? (request.body.formdata ?? []).filter((field) => !field.disabled).map((field) => `  --form ${shellQuote(`${field.key}=${field.type === 'file' ? '@/path/to/file' : field.value ?? ''}`)}`) : []),
  ].join(' \\\n')

  function formatBody(body: string) {
    try { return JSON.stringify(JSON.parse(body), null, 2) } catch { return body }
  }

  return (
    <details className="developer-docs-endpoint">
      <summary><span className={`developer-docs-method developer-docs-method-${request.method.toLowerCase()}`}>{request.method}</span><span><strong>{endpoint.name}</strong><code>/{path.replace(/^\//, '')}</code></span><Icon name="expand_more" size={22} /></summary>
      <div className="developer-docs-endpoint-body">
        {request.description && <Markdown remarkPlugins={[remarkGfm]}>{request.description}</Markdown>}
        <p className="developer-docs-auth"><Icon name="lock" size={17} />{tokenAuth ? 'Workspace session Bearer token required.' : keyAuth ? 'Workspace API key and secret required.' : 'No API authentication required for this endpoint.'}</p>
        <h3>Example request</h3>
        <pre><code>{curl}</code></pre>
        {query.length > 0 && <><h3>Query parameters</h3><div className="developer-docs-table"><table><thead><tr><th>Parameter</th><th>Example</th><th>Details</th></tr></thead><tbody>{query.map((field) => <tr key={field.key}><td><code>{field.key}</code></td><td><code>{field.value}</code></td><td>{field.description}</td></tr>)}</tbody></table></div></>}
        {request.body?.mode === 'formdata' && <><h3>Form fields</h3><ul>{request.body.formdata?.map((field) => <li key={field.key}><code>{field.key}</code> — {field.description || field.type}</li>)}</ul></>}
        {endpoint.response?.filter((response) => response.body).map((response, index) => <div key={`${response.code}-${index}`}><h3>Example response · {response.code}</h3><pre><code>{formatBody(response.body!)}</code></pre></div>)}
      </div>
    </details>
  )
}

function ReferenceGroup({ group, baseUrl }: { group: ReferenceItem; baseUrl: string }) {
  return <section className="developer-docs-reference-group"><h2>{group.name}</h2>{group.description && <Markdown remarkPlugins={[remarkGfm]}>{group.description}</Markdown>}{group.item?.map((item) => item.request ? <Endpoint key={`${item.request.method}-${item.name}`} endpoint={item} baseUrl={baseUrl} /> : <ReferenceGroup key={item.name} group={item} baseUrl={baseUrl} />)}</section>
}

export function DeveloperDocsPage() {
  const [state, setState] = useState<{ data: DeveloperDocumentation | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true })
  const [reload, setReload] = useState(0)
  const [view, setView] = useState<'guide' | 'reference'>('guide')
  const [group, setGroup] = useState('integration')
  const [search, setSearch] = useState('')
  const [downloading, setDownloading] = useState<'openapi' | 'postman' | null>(null)
  const toast = useToast()

  useEffect(() => {
    const controller = new AbortController()
    developerDocsApi.get(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setState({ data, error: null, loading: false }) })
      .catch((error: Error) => { if (!controller.signal.aborted) setState({ data: null, error: error.message, loading: false }) })
    return () => controller.abort()
  }, [reload])

  async function download(format: 'openapi' | 'postman') {
    setDownloading(format)
    try { await developerDocsApi.download(format) } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not download the reference.') } finally { setDownloading(null) }
  }

  function retry() {
    setState({ data: null, error: null, loading: true })
    setReload((value) => value + 1)
  }

  const data = state.data
  const contents = data?.guide.match(/^## .+$/gm)?.map((heading) => heading.slice(3)) ?? []
  const groups = data?.reference.filter((item) => group === 'all' || (group === 'integration' ? item.name.startsWith('Integration API') || ['API Credentials', 'Webhooks'].includes(item.name) : item.name === group)).map((item) => ({ ...item, item: item.item?.filter((endpoint) => !search.trim() || JSON.stringify(endpoint).toLowerCase().includes(search.trim().toLowerCase())) })).filter((item) => item.item?.length) ?? []

  return (
    <div className="developer-docs">
      <PageHeader breadcrumbs={[{ label: 'Integrations' }, { label: 'Developer Docs' }]} title="Developer Docs" meta={<span className="developer-docs-session"><Icon name="lock" size={15} />Workspace access</span>} actions={<><Button variant="secondary" leadingIcon="download" disabled={!data || downloading !== null} isLoading={downloading === 'openapi'} onClick={() => void download('openapi')}>OpenAPI</Button><Button variant="secondary" leadingIcon="download" disabled={!data || downloading !== null} isLoading={downloading === 'postman'} onClick={() => void download('postman')}>Postman</Button></>} />
      <div className="developer-docs-inner">
        <p className="developer-docs-intro">Connect your backend to customer records, tickets and signed webhooks. Start with the guide, then explore the endpoint reference.</p>
        <div className="developer-docs-tabs" role="group" aria-label="Documentation view"><Button variant={view === 'guide' ? 'primary' : 'secondary'} aria-pressed={view === 'guide'} leadingIcon="menu_book" onClick={() => setView('guide')}>Integration guide</Button><Button variant={view === 'reference' ? 'primary' : 'secondary'} aria-pressed={view === 'reference'} leadingIcon="data_object" onClick={() => setView('reference')}>API reference</Button></div>
        {state.loading && <LoadingState label="Loading developer documentation…" />}
        {state.error && <ErrorState title="Could not load the documentation" description={state.error} onRetry={retry} />}
        {data && view === 'guide' && <div className="developer-docs-guide-layout"><nav aria-label="Integration guide contents" className="developer-docs-contents"><h2>In this guide</h2>{contents.map((heading) => <a key={heading} href={`#${headingId(heading)}`}>{heading}</a>)}</nav><article className="developer-docs-guide"><Markdown remarkPlugins={[remarkGfm]} components={{ h1: ({ children }) => <h2 className="developer-docs-guide-title">{children}</h2>, h2: ({ children }) => <h2 id={headingId(String(children))}>{children}</h2>, table: ({ children }) => <div className="developer-docs-table"><table>{children}</table></div> }}>{data.guide}</Markdown></article></div>}
        {data && view === 'reference' && <div className="developer-docs-reference"><div className="developer-docs-filters"><label>Reference group<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="integration">Integration API, credentials & webhooks</option><option value="all">All endpoints</option>{data.reference.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}</select></label><label>Find an endpoint<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, path or scope" /></label></div>{groups.map((item) => <ReferenceGroup key={item.name} group={item} baseUrl={data.baseUrl} />)}{groups.length === 0 && <p>No endpoints match your search.</p>}</div>}
      </div>
    </div>
  )
}
