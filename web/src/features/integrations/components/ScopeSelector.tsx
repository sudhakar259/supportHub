import { Checkbox } from '@/components/ui/Checkbox'
import { Icon } from '@/components/ui/Icon'
import type { ApiCredentialScope } from '@/features/integrations/types'
import { SCOPE_GROUPS } from '@/features/integrations/types'

export interface ScopeSelectorProps {
  selected: ApiCredentialScope[]
  onChange: (scopes: ApiCredentialScope[]) => void
}

/** Grouped scope checklist used by both credential creation and the detail page's scope editor. */
export function ScopeSelector({ selected, onChange }: ScopeSelectorProps) {
  function toggle(scope: ApiCredentialScope) {
    onChange(selected.includes(scope) ? selected.filter((s) => s !== scope) : [...selected, scope])
  }

  function toggleGroup(groupScopes: ApiCredentialScope[]) {
    const allSelected = groupScopes.every((s) => selected.includes(s))
    onChange(allSelected ? selected.filter((s) => !groupScopes.includes(s)) : [...new Set([...selected, ...groupScopes])])
  }

  return (
    <div className="flex flex-col gap-space-lg">
      {SCOPE_GROUPS.map((group) => {
        const groupScopes = group.scopes.map((s) => s.scope)
        const selectedCount = groupScopes.filter((s) => selected.includes(s)).length

        return (
          <div key={group.key} className="rounded-xl bg-surface-container-low p-space-md shadow-sm">
            <div className="mb-space-sm flex items-center justify-between pb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="rounded-lg bg-surface-container-highest p-1.5 text-secondary">
                  <Icon name={group.icon} size={18} />
                </span>
                <div>
                  <h3 className="text-title-sm text-on-surface">{group.label}</h3>
                  <span className="text-label-sm text-on-surface-variant">
                    {selectedCount} of {groupScopes.length} scopes enabled
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleGroup(groupScopes)}
                className="text-label-sm font-bold uppercase text-primary hover:underline"
              >
                {selectedCount === groupScopes.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-col gap-space-xs">
              {group.scopes.map(({ scope, description }) => (
                <div
                  key={scope}
                  className="rounded-lg bg-surface-container-lowest p-space-sm transition-colors hover:bg-surface-container-high"
                >
                  <Checkbox
                    checked={selected.includes(scope)}
                    onChange={() => toggle(scope)}
                    label={<span className="font-code-sm text-code-sm">{scope}</span>}
                    description={<span className="text-body-sm text-on-surface-variant">{description}</span>}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
