import { describe, expect, it } from 'vitest'

import type { User } from '@/types/user'
import { isPlatformAdmin } from '@/types/user'

const base: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  roles: [],
  permissions: [],
} as unknown as User

describe('isPlatformAdmin', () => {
  it('is true only for the Platform Admin role', () => {
    expect(isPlatformAdmin({ ...base, roles: ['Platform Admin'] } as unknown as User)).toBe(true)
    expect(isPlatformAdmin({ ...base, roles: ['Administrator'] } as unknown as User)).toBe(false)
  })

  it('is false when there is no user', () => {
    expect(isPlatformAdmin(null)).toBe(false)
    expect(isPlatformAdmin(undefined)).toBe(false)
  })
})
