import { describe, expect, it, vi } from 'vitest'
import { impersonatorStorage, tokenStorage } from '@/services/storage/tokenStorage'

describe('DeskNu storage migration', () => {
  it('preserves an existing session and moves it to the new key', () => {
    localStorage.setItem('supporthub.token', 'existing-session')
    expect(tokenStorage.get()).toBe('existing-session')
    expect(localStorage.getItem('desknu.token')).toBe('existing-session')
    expect(localStorage.getItem('supporthub.token')).toBeNull()
  })

  it('prefers the current session and clears both keys on logout', () => {
    localStorage.setItem('desknu.token', 'current')
    localStorage.setItem('supporthub.token', 'old')
    expect(tokenStorage.get()).toBe('current')
    tokenStorage.clear()
    expect(tokenStorage.get()).toBeNull()
    expect(localStorage.getItem('supporthub.token')).toBeNull()
  })

  it('keeps an existing session usable when the new key cannot be written', () => {
    localStorage.setItem('supporthub.token', 'existing-session')
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })
    try {
      expect(tokenStorage.get()).toBe('existing-session')
      expect(localStorage.getItem('supporthub.token')).toBe('existing-session')
    } finally {
      write.mockRestore()
    }
  })

  it('preserves an administrator return session and removes it after return', () => {
    const session = { token: 'admin-session', name: 'Admin' }
    sessionStorage.setItem('supporthub.impersonator', JSON.stringify(session))
    expect(impersonatorStorage.get()).toEqual(session)
    expect(sessionStorage.getItem('supporthub.impersonator')).toBeNull()
    impersonatorStorage.clear()
    expect(impersonatorStorage.get()).toBeNull()
  })
})
