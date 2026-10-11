import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

// Copies the supplied artwork without changing its pixels. SVGs frame the existing
// PNG artwork; they do not recreate its shape. Run manually when design/logo changes.
const root = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const source = resolve(root, 'design/logo')
const web = resolve(root, 'web/public')
const api = resolve(root, 'api/public')
const logo = await readFile(resolve(source, 'deskNu-logo.png'))
const favicon = await readFile(resolve(source, 'favicon.png'))
const logoData = `data:image/png;base64,${logo.toString('base64')}`
const iconData = `data:image/png;base64,${favicon.toString('base64')}`

for (const target of [web, api]) {
  await mkdir(resolve(target, 'branding'), { recursive: true })
  for (const name of ['deskNu-logo.png', 'light-mode-desknu-logo.png', 'dark-mode-desknu-logo.png']) {
    await copyFile(resolve(source, name), resolve(target, 'branding', name))
  }
  await writeFile(resolve(target, 'favicon.png'), favicon)
  // Compatibility for existing bookmarks requesting /favicon.ico: an ICO container
  // holds the supplied PNG directly, preserving the original artwork.
  const ico = Buffer.alloc(22)
  ico.writeUInt16LE(1, 2)
  ico.writeUInt16LE(1, 4)
  ico[6] = 200
  ico[7] = 184
  ico.writeUInt16LE(1, 10)
  ico.writeUInt16LE(32, 12)
  ico.writeUInt32LE(favicon.length, 14)
  ico.writeUInt32LE(22, 18)
  await writeFile(resolve(target, 'favicon.ico'), Buffer.concat([ico, favicon]))
  const wordmark = `<svg xmlns="http://www.w3.org/2000/svg" width="174" height="48" viewBox="0 0 174 48"><svg x="0" y="4" width="34" height="40" viewBox="49 45 101 116"><image href="${logoData}" width="200" height="184"/></svg><text x="43" y="34" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="-1" fill="#ffffff">Desk<tspan fill="#ea580c">Nu</tspan>.</text></svg>`
  await writeFile(resolve(target, 'branding/wordmark-dark.svg'), wordmark)
}
await writeFile(resolve(web, 'brand-mark.png'), logo)
await writeFile(resolve(web, 'brand-mark.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="230" viewBox="49 45 101 116"><image href="${logoData}" width="200" height="184"/></svg>`)
await writeFile(resolve(web, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="16 16 168 168"><image href="${iconData}" width="200" height="184"/></svg>`)

await writeFile(resolve(web, 'social-card.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f8f9ff"/>
<path d="M900 0h300v630H760c100-70 120-180 85-270S800 85 900 0" fill="#e5eeff"/>
<circle cx="1100" cy="98" r="170" fill="#ffdbce"/>
<svg x="76" y="65" width="56" height="64" viewBox="49 45 101 116"><image href="${logoData}" width="200" height="184"/></svg>
<g font-family="DM Sans, Arial, Helvetica, sans-serif" font-weight="500" fill="#0b1c30"><text x="151" y="112" font-size="45" font-weight="700" letter-spacing="-2">Desk<tspan fill="#a33900">Nu</tspan>.</text><text x="76" y="211" font-size="17" font-weight="700" letter-spacing="3" fill="#a33900">HELPDESK &amp; CUSTOMER SUPPORT SOFTWARE</text><text x="72" y="298" font-size="68" font-weight="700" letter-spacing="-3">Customer support.</text><text x="72" y="378" font-size="68" font-weight="700" letter-spacing="-3">One shared desk.</text><text x="76" y="452" font-size="24" fill="#5a4138">Tickets, email, routing and SLAs.</text><text x="76" y="489" font-size="24" fill="#5a4138">Your team’s next step, in one workspace.</text></g>
<g transform="translate(910 285)"><rect width="205" height="157" rx="18" fill="#ffffff" stroke="#e2bfb2"/><rect x="23" y="25" width="36" height="36" rx="9" fill="#dcfce7"/><path d="m33 43 7 7 12-15" fill="none" stroke="#15803d" stroke-width="3" stroke-linecap="round"/><rect x="76" y="30" width="100" height="8" rx="4" fill="#0b1c30"/><rect x="76" y="47" width="69" height="6" rx="3" fill="#5a4138"/><rect x="23" y="82" width="159" height="7" rx="3.5" fill="#e5eeff"/><rect x="23" y="100" width="131" height="7" rx="3.5" fill="#e5eeff"/><rect x="23" y="123" width="71" height="13" rx="6" fill="#a33900"/></g>
<rect x="76" y="557" width="1048" height="1" fill="#e2bfb2"/>
</svg>`)
console.log('Copied the supplied DeskNu logos and favicon to the web and API public assets. Refresh the social-card and touch-icon PNG exports before building.')
