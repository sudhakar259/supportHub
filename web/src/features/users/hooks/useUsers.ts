import { useCallback, useEffect, useState } from 'react'

import { usersApi } from '@/features/users/api/usersApi'
import type { UserFilters } from '@/features/users/types'
import type { PaginationMeta } from '@/types/pagination'
import type { User } from '@/types/user'

export function useUsers(filters: UserFilters) {
  const [users, setUsers] = useState<User[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    usersApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setUsers(page.items)
        setMeta(page.meta)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [JSON.stringify(filters), reloadToken])

  return { users, meta, isLoading, error, refetch }
}
