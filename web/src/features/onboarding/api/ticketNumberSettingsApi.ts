import type { ResetPeriod, TicketNumberSetting, TicketNumberSettingPayload } from '@/features/onboarding/types'
import { apiFetch } from '@/services/api/client'

/** Mirrors api/app/Http/Resources/TicketNumberSettingResource.php */
interface RawTicketNumberSetting {
  id: number
  department_id: number | null
  prefix: string
  format: string
  starting_number: number
  number_length: number
  reset_period: ResetPeriod
  is_active: boolean
  effective_from: string | null
}

function mapTicketNumberSetting(raw: RawTicketNumberSetting): TicketNumberSetting {
  return {
    id: raw.id,
    departmentId: raw.department_id,
    prefix: raw.prefix,
    format: raw.format,
    startingNumber: raw.starting_number,
    numberLength: raw.number_length,
    resetPeriod: raw.reset_period,
    isActive: raw.is_active,
    effectiveFrom: raw.effective_from,
  }
}

/** Maps 1:1 to api/routes/api/ticket-number-settings.php — see TicketNumberSettingController.php. */
export const ticketNumberSettingsApi = {
  async list(): Promise<TicketNumberSetting[]> {
    const raw = await apiFetch<RawTicketNumberSetting[]>('/ticket-number-settings')
    return raw.map(mapTicketNumberSetting)
  },

  async create(payload: TicketNumberSettingPayload): Promise<TicketNumberSetting> {
    const raw = await apiFetch<RawTicketNumberSetting>('/ticket-number-settings', {
      method: 'POST',
      body: {
        prefix: payload.prefix,
        format: payload.format,
        starting_number: payload.startingNumber,
        number_length: payload.numberLength,
        reset_period: payload.resetPeriod,
        is_active: payload.isActive ?? true,
      },
    })
    return mapTicketNumberSetting(raw)
  },
}
