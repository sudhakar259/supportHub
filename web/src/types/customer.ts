import type { User } from '@/types/user'

/** A free-text column (see customers migration); 'individual' | 'business' | 'vip' are the values currently seeded. */
export type CustomerType = 'individual' | 'business' | 'vip' | (string & {})

/** Mirrors api/app/Http/Resources/CustomerResource.php */
export interface Customer {
  id: number
  companyName: string | null
  customerType: CustomerType
  phone: string | null
  timezone: string | null
  user: User | null
}
