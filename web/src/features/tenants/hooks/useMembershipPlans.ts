import { useEffect, useState } from 'react'

import { membershipPlansApi } from '@/features/tenants/api/membershipPlansApi'
import type { MembershipPlan } from '@/features/tenants/types'

export function useMembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    membershipPlansApi
      .list()
      .then((items) => {
        if (!cancelled) setPlans(items)
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
  }, [])

  return { plans, isLoading, error }
}
