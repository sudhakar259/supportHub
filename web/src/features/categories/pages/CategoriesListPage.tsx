import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/feedback/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { LoadingState } from '@/components/feedback/LoadingState'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { IconButton } from '@/components/ui/IconButton'
import { categoriesApi } from '@/features/categories/api/categoriesApi'
import { CategoryFormModal } from '@/features/categories/components/CategoryFormModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'
import type { TicketCategory } from '@/types/ticket'

export function CategoriesListPage() {
  const { user } = useAuth()
  const canCreate = hasPermission(user, 'categories.create')
  const canUpdate = hasPermission(user, 'categories.update')
  const canDelete = hasPermission(user, 'categories.delete')
  const [categories, setCategories] = useState<TicketCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [formState, setFormState] = useState<{ category: TicketCategory | null; defaultParentId?: number } | null>(null)
  const [deletingCategory, setDeletingCategory] = useState<TicketCategory | null>(null)

  useEffect(() => {
    setIsLoading(true)
    categoriesApi
      .list()
      .then(setCategories)
      .catch((err: Error) => setError(err))
      .finally(() => setIsLoading(false))
  }, [reloadToken])

  const refetch = () => setReloadToken((t) => t + 1)

  function renderRow(category: TicketCategory, depth: number) {
    return (
      <div key={category.id} className="flex flex-col">
        <div className="flex items-center justify-between py-space-sm" style={{ paddingLeft: depth * 24 }}>
          <div className="flex items-center gap-2">
            {depth > 0 && <Icon name="subdirectory_arrow_right" size={16} className="text-secondary" />}
            <span className="text-title-sm font-semibold text-on-surface">{category.name}</span>
            <span className="font-code-sm text-code-sm text-secondary">{category.slug}</span>
            {!category.isActive && <Badge tone="danger">Inactive</Badge>}
          </div>
          <div className="flex items-center gap-1">
            {canCreate && depth === 0 && (
              <IconButton icon="add" label="Add subcategory" onClick={() => setFormState({ category: null, defaultParentId: category.id })} />
            )}
            {canUpdate && <IconButton icon="edit" label="Edit category" onClick={() => setFormState({ category })} />}
            {canDelete && <IconButton icon="delete" label="Delete category" onClick={() => setDeletingCategory(category)} />}
          </div>
        </div>
        {category.children.map((child) => renderRow(child, depth + 1))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader
        breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Categories' }]}
        title="Categories"
        actions={
          canCreate && (
            <button
              type="button"
              onClick={() => setFormState({ category: null })}
              className="inline-flex h-9 items-center gap-space-sm rounded bg-primary px-space-md text-title-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container"
            >
              <Icon name="add" size={18} />
              Create Category
            </button>
          )
        }
      />

      <div className="px-gutter-lg">
        <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm">
          {isLoading && <LoadingState label="Loading categories…" />}
          {error && <ErrorState description={error.message} onRetry={refetch} />}
          {!isLoading && !error && categories.length === 0 && (
            <p className="py-space-md text-center text-body-sm text-on-surface-variant">No categories yet.</p>
          )}
          {!isLoading && !error && (
            <div className="flex flex-col divide-y divide-surface-container-low">{categories.map((c) => renderRow(c, 0))}</div>
          )}
        </div>
      </div>

      {formState && (
        <CategoryFormModal
          isOpen
          category={formState.category}
          defaultParentId={formState.defaultParentId}
          topLevelCategories={categories}
          onClose={() => setFormState(null)}
          onSaved={refetch}
        />
      )}
      {deletingCategory && (
        <ConfirmDialog
          isOpen
          onClose={() => setDeletingCategory(null)}
          title="Delete Category"
          description={`Delete "${deletingCategory.name}"? Subcategories are removed too; tickets already using it keep their category reference.`}
          successMessage={`"${deletingCategory.name}" deleted.`}
          onConfirm={async () => {
            await categoriesApi.destroy(deletingCategory.id)
            refetch()
          }}
        />
      )}
    </div>
  )
}
