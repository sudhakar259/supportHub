<?php

namespace App\Services;

/**
 * The fixed status workflow graph (section 8 of the spec), keyed by
 * status slug rather than id so it survives statuses being re-seeded.
 * Administrators can still add extra non-workflow statuses via the
 * Statuses API (e.g. for labeling/reporting), but only these seven
 * participate in transition validation — see docs/ticket-workflow.md.
 */
class TicketStatusWorkflow
{
    public const OPEN = 'open';

    public const IN_PROGRESS = 'in-progress';

    public const PENDING = 'pending';

    public const ESCALATED = 'escalated';

    public const RESOLVED = 'resolved';

    public const CLOSED = 'closed';

    public const REOPENED = 'reopened';

    /**
     * @var array<string, array<int, string>>
     */
    public const TRANSITIONS = [
        self::OPEN => [self::IN_PROGRESS, self::PENDING, self::ESCALATED, self::RESOLVED],
        self::IN_PROGRESS => [self::PENDING, self::ESCALATED, self::RESOLVED, self::OPEN],
        self::PENDING => [self::IN_PROGRESS, self::ESCALATED, self::RESOLVED, self::OPEN],
        self::ESCALATED => [self::IN_PROGRESS, self::PENDING, self::RESOLVED],
        self::RESOLVED => [self::CLOSED, self::REOPENED, self::IN_PROGRESS],
        self::CLOSED => [self::REOPENED],
        self::REOPENED => [self::IN_PROGRESS, self::PENDING, self::ESCALATED, self::RESOLVED],
    ];

    public function isKnownStatus(string $slug): bool
    {
        return array_key_exists($slug, self::TRANSITIONS);
    }

    public function canTransition(string $fromSlug, string $toSlug): bool
    {
        if ($fromSlug === $toSlug) {
            return false;
        }

        // A status outside the fixed workflow (an admin-added label) has
        // no defined transitions; allow moving away from it freely but
        // not into it, since nothing declares it a valid destination.
        if (! $this->isKnownStatus($fromSlug)) {
            return false;
        }

        return in_array($toSlug, self::TRANSITIONS[$fromSlug] ?? [], true);
    }

    public function allowedTransitions(string $fromSlug): array
    {
        return self::TRANSITIONS[$fromSlug] ?? [];
    }
}
