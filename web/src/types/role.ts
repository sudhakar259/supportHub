/** Mirrors api/app/Http/Resources/RoleResource.php */
export interface Role {
  id: number
  name: string
  permissions: string[]
  usersCount: number | null
  createdAt: string | null
}

/** Mirrors api/app/Http/Resources/PermissionResource.php. Names are "resource.action", e.g. "tickets.view". */
export interface Permission {
  id: number
  name: string
}

export interface PermissionGroup {
  resource: string
  permissions: Permission[]
}

/** Groups flat "resource.action" permissions by their resource prefix for a readable matrix. */
export function groupPermissionsByResource(permissions: Permission[]): PermissionGroup[] {
  const groups = new Map<string, Permission[]>()
  for (const permission of permissions) {
    const resource = permission.name.split('.')[0]
    const list = groups.get(resource) ?? []
    list.push(permission)
    groups.set(resource, list)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([resource, perms]) => ({ resource, permissions: perms }))
}
