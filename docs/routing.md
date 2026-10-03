# Routing & Assignment

Routing rules, departments, and agent workload are all tenant-scoped
automatically (`TenantScope` — see `docs/multi-tenancy.md`): a rule only
ever evaluates against its own tenant's categories/priorities/departments,
and can never route a ticket into another tenant's department or assign it
to another tenant's agent.

## Routing rules

Evaluated by `ApplyTicketRoutingAction` against every newly-created ticket,
in `priority` order (lowest number first — think "runs first"). Manage them
via `GET/POST/PUT/DELETE /api/v1/routing-rules` (`routing.view` /
`routing.manage`).

### Conditions

A rule's `conditions` array is **AND-combined** — every condition must match
for the rule's actions to apply:

```json
[
  { "field": "category_id", "operator": "=", "value": 3 },
  { "field": "customer_type", "operator": "=", "value": "vip" }
]
```

Supported fields: `category_id`, `priority_id`, `customer_type` (reads the
customer's `customer_type`: `individual`/`business`/`vip`), `keyword`
(substring match, case-insensitive, against `subject + description` —
`operator` is ignored for this field). Supported operators for the other
fields: `=`, `!=`, `in` (value is an array).

### Actions

A matching rule's `actions` array runs in order:

```json
[
  { "type": "assign_department", "value": 2 },
  { "type": "set_priority", "value": 4 },
  { "type": "escalate" },
  { "type": "send_notification", "value": "ticket_escalated" }
]
```

| Action | Effect |
|---|---|
| `assign_department` | Sets the ticket's `department_id` |
| `assign_agent` | Pins a specific agent as the assignee, bypassing workload-based auto-assignment |
| `set_priority` | Overrides the ticket's `priority_id` |
| `escalate` | Ticket is created directly in the `Escalated` status instead of `Open` |
| `send_notification` | Sends the named notification template key to the customer, in addition to the standard `ticket_created` notification |

`stop_processing: true` on a rule halts evaluation of any further
(lower-priority-ordered) rules once that rule matches — use this for a
catch-all rule you want to be the last one considered.

### Validation

Both the condition `field` and the action `type` are validated against the
exact set `ApplyTicketRoutingAction` knows how to interpret
(`StoreRoutingRuleRequest`/`UpdateRoutingRuleRequest`). A rule referencing an
unsupported field or action type is rejected at write time with `422`,
rather than being saved and silently doing nothing when it's evaluated.

## Automatic agent assignment

If a ticket's `department_id` ends up set (by a routing rule, or because it
was provided directly) and no routing rule pinned a specific
`assign_agent`, `AutoAssignAgentAction` picks the agent with the **fewest
currently-open tickets** among that department's members holding the Agent
or Senior Agent role:

```php
$department->users()
    ->withCount(['assignedTickets as open_tickets_count' => fn ($q) =>
        $q->whereIn('status_id', $openStatusIds)
    ])
    ->whereHas('roles', fn ($q) => $q->whereIn('name', ['Agent', 'Senior Agent']))
    ->orderBy('open_tickets_count')
    ->first();
```

Department Managers and Administrators are deliberately excluded from this
pool — their broader access shouldn't mean they silently absorb front-line
queue load. If the department has no eligible agents, the ticket is simply
left unassigned (still visible to any staff member with access to that
department, per `docs/authorization.md`).

Manual assignment/reassignment (`POST /tickets/{ticket}/assign` or
`/reassign`) always takes precedence when called explicitly — see
`docs/ticket-workflow.md` for the append-only assignment history.

## Escalation

Escalation can happen two ways:

1. **At creation**, via a routing rule's `escalate` action.
2. **Later**, via `POST /tickets/{ticket}/escalate` (requires
   `tickets.escalate` — Agent does not hold this by default; Senior Agent,
   Department Manager, and Administrator do).

Either path fires `TicketEscalated`, which notifies the ticket's department
managers and senior agents, plus the current assignee if any — see
`docs/notifications.md`.
