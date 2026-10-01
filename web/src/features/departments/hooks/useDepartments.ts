import { useCallback, useEffect, useState } from 'react'

import { departmentsApi } from '@/features/departments/api/departmentsApi'
import type { DepartmentFilters } from '@/features/departments/types'
import type { Department } from '@/types/department'
import type { PaginationMeta } from '@/types/pagination'

export function useDepartments(filters: DepartmentFilters) {
  const [departments, setDepartments] = useState<Department[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const refetch = useCallback(() => setReloadToken((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    departmentsApi
      .list(filters)
      .then((page) => {
        if (cancelled) return
        setDepartments(page.items)
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

  return { departments, meta, isLoading, error, refetch }
}
