<?php

namespace App\Notifications;

use App\Models\NotificationLog;
use App\Models\Tenant;
use App\Support\TenantContext;
use App\Support\TenantEmailBranding;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Throwable;

class TicketEventNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $eventKey,
        public string $subject,
        public string $body,
        public ?string $actionUrl = null,
        public ?int $notificationLogId = null,
        public ?int $tenantId = null,
    ) {
        $this->onQueue('notifications');
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    /**
     * Built inside the tenant this notification belongs to, so branding and
     * any template lookup resolve the same way whether the mail is sent
     * during the request or later by a queue worker.
     */
    public function toMail(object $notifiable): MailMessage
    {
        $tenantId = $this->tenantId ?? app(TenantContext::class)->id();
        $tenant = $tenantId ? Tenant::find($tenantId) : null;

        return app(TenantContext::class)->runAs($tenant, fn () => $this->buildMail($notifiable, $tenant));
    }

    private function buildMail(object $notifiable, ?Tenant $tenant): MailMessage
    {
        $branding = TenantEmailBranding::forTenant($tenant);
        $recipientName = trim((string) ($notifiable->name ?? ''));

        $mail = (new MailMessage)
            ->subject($this->subject)
            ->greeting($recipientName !== '' ? "Hello {$recipientName}," : 'Hello,')
            ->line($this->body);

        if ($this->actionUrl) {
            $mail->action('View ticket', $this->actionUrl);
        }

        $mail->line($tenant
            ? "This message was sent by {$tenant->name} through SupportHub."
            : 'This message was sent through SupportHub.');

        $mail->from(config('mail.from.address'), $branding['sender_name']);

        if ($branding['reply_to']) {
            $mail->replyTo($branding['reply_to']);
        }

        $mail->salutation($branding['signature']);

        return $mail;
    }

    public function failed(Throwable $exception): void
    {
        if (! $this->notificationLogId) {
            return;
        }

        NotificationLog::whereKey($this->notificationLogId)->update([
            'status' => 'failed',
            'error' => $exception->getMessage(),
        ]);
    }
}
