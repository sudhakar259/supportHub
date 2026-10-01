export type SettingType = 'string' | 'integer' | 'boolean' | 'json'

/** Mirrors api/app/Http/Resources/SystemSettingResource.php */
export interface SystemSetting {
  key: string
  value: unknown
  type: SettingType
  group: string
  isPublic: boolean
}

export interface SystemSettingFormPayload {
  key: string
  value: unknown
  type?: SettingType
  group?: string
  isPublic?: boolean
}
