<?php

namespace App\Actions\Ticket;

use App\Enums\NotificationLogStatus;
use App\Models\NotificationLog;
use App\Models\NotificationPreference;
use App\Models\NotificationTemplate;
use App\Models\User;
use App\Notifications\TicketEventNotification;
use App\Services\TemplateRenderingService;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

/**
 * Central dispatcher for every ticket-related notification. Looks up
 * the NotificationTemplate for the event, renders it with the given
 * variables, respects each recipient's NotificationPreference
 * (opt-out, not opt-in — a missing preference row means enabled), and
 * records one notification_logs row per recipient before queuing
 * delivery.
 */
class SendTicketNotificationAction
{
    public function __construct(private TemplateRenderingService $renderer) {}

    /**
     * @param  User[]  $recipients
     * @param  array<string, string|int|null>  $variables
     */
    public function execute(string $eventKey, array $recipients, array $variables, ?string $actionUrl = null): void
    {
        $template = NotificationTemplate::where('key', $eventKey)->where('is_active', true)->first();

        if (! $template) {
            Log::warning("No active notification template for event [{$eventKey}]; skipping.");

            return;
        }

        foreach (array_filter(array_unique($recipients, SORT_REGULAR)) as $recipient) {
            if (! $this->isEnabled($recipient, $template->channel, $eventKey)) {
                continue;
            }

            $log = NotificationLog::create([
                'notifiable_type' => $recipient->getMorphClass(),
                'notifiable_id' => $recipient->id,
                'channel' => $template->channel,
                'event_key' => $eventKey,
                'notification_template_id' => $template->id,
                'status' => 'queued',
            ]);

            $notification = new TicketEventNotification(
                eventKey: $eventKey,
                subject: $this->renderer->render($template->subject, $variables),
                body: $this->renderer->render($template->body, $variables),
                actionUrl: $actionUrl,
                notificationLogId: $log->id,
                tenantId: app(TenantContext::class)->id(),
            );

            try {
                Notification::send($recipient, $notification);
            } catch (Throwable $e) {
                report($e);
                $log->update(['status' => NotificationLogStatus::Failed, 'error' => $e->getMessage()]);
            }
        }
    }

    private function isEnabled(User $recipient, string $channel, string $eventKey): bool
    {
        $preference = NotificationPreference::where('user_id', $recipient->id)
            ->where('channel', $channel)
            ->where('event_key', $eventKey)
            ->first();

        return $preference?->enabled ?? true;
    }
}
