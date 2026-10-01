<?php

namespace App\Listeners\Ticket;

use App\Actions\Ticket\SendTicketNotificationAction;
use App\Events\TicketStatusChanged;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Fires on every status change, in addition to the more specific
 * TicketEscalated/TicketResolved/TicketClosed/TicketReopened listeners
 * below. This one always targets the customer; the specific ones
 * target staff (escalation) or reuse the same customer-facing template
 * keys for resolved/closed/reopened, so there is no double-send to the
 * customer for those three — see each listener's docblock.
 */
class SendTicketStatusChangedNotification implements ShouldQueue
{
    use BuildsTicketNotificationContext;

    public function __construct(private SendTicketNotificationAction $send) {}

    public function handle(TicketStatusChanged $event): void
    {
        $ticket = $event->ticket;

        if (in_array($event->toStatus->slug, ['resolved', 'closed', 'reopened', 'escalated'], true)) {
            return;
        }

        $this->send->execute(
            'ticket_status_changed',
            array_filter([$ticket->customer?->user]),
            $this->variables($ticket),
            $this->ticketUrl($ticket)
        );
    }
}
