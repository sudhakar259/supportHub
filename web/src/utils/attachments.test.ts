import { describe, expect, it } from 'vitest'

import { ATTACHMENT_MAX_BYTES, checkAttachments } from '@/utils/attachments'

function file(name: string, size = 1000): File {
  const f = new File(['x'], name)
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('checkAttachments', () => {
  it.each(['a.jpg', 'a.JPEG', 'a.png', 'a.webp', 'a.txt', 'a.pdf', 'a.docx', 'a.ppt', 'a.pptx'])('accepts %s', (name) => {
    expect(checkAttachments([], [file(name)])).toEqual({ accepted: [expect.any(File)], errors: [] })
  })

  it.each(['a.gif', 'a.zip', 'a.xlsx', 'a.exe', 'noextension'])('rejects %s as a type', (name) => {
    const result = checkAttachments([], [file(name)])
    expect(result.accepted).toHaveLength(0)
    expect(result.errors[0]).toMatch(/not an allowed file type/)
  })

  it('accepts exactly 2 MB and rejects anything larger', () => {
    expect(checkAttachments([], [file('ok.pdf', ATTACHMENT_MAX_BYTES)]).accepted).toHaveLength(1)
    const tooBig = checkAttachments([], [file('big.pdf', ATTACHMENT_MAX_BYTES + 1)])
    expect(tooBig.accepted).toHaveLength(0)
    expect(tooBig.errors[0]).toMatch(/limit is 2 MB/)
  })

  it('allows at most 5 files in total', () => {
    const existing = [file('1.png'), file('2.png'), file('3.png'), file('4.png')]
    const result = checkAttachments(existing, [file('5.png'), file('6.png')])
    expect(result.accepted).toHaveLength(1)
    expect(result.errors[0]).toMatch(/at most 5/)
  })

  it('keeps valid files and reports the invalid ones from the same selection', () => {
    const result = checkAttachments([], [file('good.pdf'), file('bad.zip')])
    expect(result.accepted.map((f) => f.name)).toEqual(['good.pdf'])
    expect(result.errors).toHaveLength(1)
  })
})
