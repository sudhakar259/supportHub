import { useMemo, useState } from 'react'

import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { NotificationTemplatesPanel } from '@/features/automation/components/NotificationTemplatesPanel'
import { RoutingRulesPanel } from '@/features/automation/components/RoutingRulesPanel'
import { SlaPoliciesPanel } from '@/features/automation/components/SlaPoliciesPanel'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { hasPermission } from '@/types/user'

type Tab = 'routing' | 'sla' | 'notifications'

// QA finding, 2026-10-01: the page was reachable with any one of
// routing.view/sla.view/notifications.view, but all 3 tabs rendered
// unconditionally regardless of which specific permission the user
// actually held — a user with only sla.view still saw (and could click
// into) the Routing Rules and Notification Templates tabs, which would
// then 403 from the API. Gate each tab by its own permission instead.
const ALL_TABS = [
  { key: 'routing' as const, label: 'Routing Rules', permission: 'routing.view' },
  { key: 'sla' as const, label: 'SLA Policies', permission: 'sla.view' },
  { key: 'notifications' as const, label: 'Notification Templates', permission: 'notifications.view' },
]

export function AutomationPage() {
  const { user } = useAuth()
  const visibleTabs = useMemo(() => ALL_TABS.filter((t) => hasPermission(user, t.permission)), [user])
  const [tab, setTab] = useState<Tab>(visibleTabs[0]?.key ?? 'routing')
  const activeTab = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key

  return (
    <div className="flex flex-col gap-space-md pb-space-xl">
      <PageHeader breadcrumbs={[{ label: 'Workspace' }, { label: 'Governance' }, { label: 'Automation' }]} title="Automation" />

      <div className="px-gutter-lg">
        <Tabs
          items={visibleTabs}
          activeKey={activeTab}
          onChange={(key) => setTab(key as Tab)}
          className="mb-space-md rounded-lg bg-surface-container-low p-1"
        />

        {activeTab === 'routing' && <RoutingRulesPanel />}
        {activeTab === 'sla' && <SlaPoliciesPanel />}
        {activeTab === 'notifications' && <NotificationTemplatesPanel />}
      </div>
    </div>
  )
}
