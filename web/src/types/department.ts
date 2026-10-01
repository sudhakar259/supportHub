import type { User } from '@/types/user'

/** Mirrors api/app/Http/Resources/DepartmentResource.php */
export interface Department {
  id: number
  name: string
  code: string | null
  description: string | null
  manager: User | null
  isActive: boolean
  agentsCount: number | null
  ticketsCount: number | null
}
