import { apiFetch } from '@/services/api/client'
import type { SystemSetting, SystemSettingFormPayload } from '@/types/systemSetting'

interface RawSystemSetting {
  key: string
  value: unknown
  type: SystemSetting['type']
  group: string
  is_public: boolean
}

function mapSystemSetting(raw: RawSystemSetting): SystemSetting {
  return { key: raw.key, value: raw.value, type: raw.type, group: raw.group, isPublic: raw.is_public }
}

/** Maps 1:1 to api/routes/api/settings.php — see SystemSettingController.php for the exact contract. */
export const systemSettingsApi = {
  async list(): Promise<SystemSetting[]> {
    const raw = await apiFetch<RawSystemSetting[]>('/settings')
    return raw.map(mapSystemSetting)
  },

  async upsert(settings: SystemSettingFormPayload[]): Promise<SystemSetting[]> {
    const raw = await apiFetch<RawSystemSetting[]>('/settings', {
      method: 'PUT',
      body: {
        settings: settings.map((s) => ({ key: s.key, value: s.value, type: s.type, group: s.group, is_public: s.isPublic })),
      },
    })
    return raw.map(mapSystemSetting)
  },
}
