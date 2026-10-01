import { useEffect, useState } from 'react'

import { lookupsApi } from '@/features/tickets/api/lookupsApi'
import { fetchOrDefault } from '@/utils/fetchOrDefault'
import type { Department } from '@/types/department'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/ticket'

interface TicketLookups {
  statuses: TicketStatus[]
  priorities: TicketPriority[]
  categories: TicketCategory[]
  departments: Department[]
}

const EMPTY: TicketLookups = { statuses: [], priorities: [], categories: [], departments: [] }

/**
 * Loads the small reference lists (statuses, priorities, categories, departments)
 * used across ticket screens. Each resource's `.view` permission is granted
 * independently per role (e.g. a plain Agent has categories/priorities/statuses
 * but not departments), so each lookup is fetched tolerantly — one 403 falls
 * back to an empty list instead of blanking out the others via Promise.all.
 */
export function useTicketLookups() {
  const [lookups, setLookups] = useState<TicketLookups>(EMPTY)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    Promise.all([
      fetchOrDefault(lookupsApi.listStatuses(), []),
      fetchOrDefault(lookupsApi.listPriorities(), []),
      fetchOrDefault(lookupsApi.listCategories(), []),
      fetchOrDefault(lookupsApi.listDepartments(), []),
    ])
      .then(([statuses, priorities, categories, departments]) => {
        if (!cancelled) setLookups({ statuses, priorities, categories, departments })
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { ...lookups, isLoading }
}
