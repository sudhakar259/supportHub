import { useEffect, useState } from 'react'

import { membershipPlansApi } from '@/features/tenants/api/membershipPlansApi'
import type { MembershipPlan } from '@/features/tenants/types'

export function useMembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    membershipPlansApi
      .list()
      .then((items) => {
        if (!cancelled) setPlans(items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error('Unable to load plans.'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  return { plans, isLoading, error, refetch: () => setAttempt((value) => value + 1) }
}
