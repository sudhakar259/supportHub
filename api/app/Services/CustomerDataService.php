<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\InboundEmail;
use App\Models\NotificationLog;
use App\Models\Ticket;
use App\Models\TicketActivity;
use App\Models\TicketAttachment;
use App\Models\TicketMessage;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Data-subject requests for one customer: a copy of what is held about them, and
 * anonymization ("erasure").
 *
 * Erasure removes the person, not the business record. Their identity is replaced
 * everywhere it is stored (account, customer record, audit entries, inbound email log,
 * sign-in tokens) so it can no longer be traced back to them. Whether the *content* of
 * their tickets goes too is the caller's choice: with $redactContent the descriptions,
 * every message and the attachments are removed as well, which is what a strict
 * erasure request needs; without it the ticket text stays for the workspace's records,
 * with the person no longer identifiable from the account.
 */
class CustomerDataService
{
    public const REDACTED_TEXT = '[Removed at the customer’s request]';

    public function __construct(private AuditLogger $audit) {}

    /** @return array<string, mixed> */
    public function export(Customer $customer): array
    {
        $user = $customer->user;

        $tickets = $customer->tickets()
            ->with(['status', 'priority', 'category', 'department', 'messages.author', 'attachments'])
            ->orderBy('created_at')
            ->get();

        return [
            'generated_at' => now()->toIso8601String(),
            'customer' => [
                'name' => $user?->name,
                'email' => $user?->email,
                'phone' => $customer->phone ?? $user?->phone,
                'company_name' => $customer->company_name,
                'customer_type' => $customer->customer_type,
                'external_id' => $customer->external_id,
                'timezone' => $customer->timezone,
                'account_created_at' => $user?->created_at?->toIso8601String(),
                'last_sign_in_at' => $user?->last_login_at?->toIso8601String(),
            ],
            'tickets' => $tickets->map(fn (Ticket $t) => [
                'ticket_number' => $t->ticket_number,
                'subject' => $t->subject,
                'description' => $t->description,
                'status' => $t->status?->name,
                'priority' => $t->priority?->name,
                'category' => $t->category?->name,
                'department' => $t->department?->name,
                'created_at' => $t->created_at?->toIso8601String(),
                'resolved_at' => $t->resolved_at?->toIso8601String(),
                'closed_at' => $t->closed_at?->toIso8601String(),
                // Internal notes are the team's private working notes and are left out; the
                // team's replies are included but not signed with a staff member's name.
                'messages' => $t->messages
                    ->reject(fn (TicketMessage $m) => $m->isInternalNote())
                    ->map(fn (TicketMessage $m) => [
                        'from' => $m->author_id === $user?->id ? 'customer' : 'support team',
                        'body' => $m->body,
                        'sent_at' => $m->created_at?->toIso8601String(),
                    ])->values()->all(),
                'attachments' => $t->attachments->map(fn (TicketAttachment $a) => [
                    'filename' => $a->original_filename,
                    'type' => $a->mime_type,
                    'size_bytes' => $a->size,
                    'uploaded_at' => $a->created_at?->toIso8601String(),
                ])->values()->all(),
            ])->all(),
            'notifications_sent' => $user
                ? NotificationLog::where('notifiable_type', $user->getMorphClass())->where('notifiable_id', $user->id)->orderBy('created_at')->get()
                    ->map(fn (NotificationLog $n) => ['event' => $n->event_key, 'channel' => $n->channel, 'status' => $n->status, 'at' => $n->created_at?->toIso8601String()])->all()
                : [],
            'emails_received' => $user
                ? InboundEmail::where('from_email', $user->email)->orderBy('created_at')->get()
                    ->map(fn (InboundEmail $e) => ['subject' => $e->subject, 'outcome' => $e->status, 'at' => $e->created_at?->toIso8601String()])->all()
                : [],
        ];
    }

    /**
     * @return array{tickets: int, messages_redacted: int, attachments_removed: int, redacted_content: bool}
     */
    public function erase(Customer $customer, bool $redactContent, User $actor): array
    {
        $user = $customer->user()->withTrashed()->first();
        $oldEmail = $user?->email;
        $summary = ['tickets' => 0, 'messages_redacted' => 0, 'attachments_removed' => 0, 'redacted_content' => $redactContent];

        DB::transaction(function () use ($customer, $user, $oldEmail, $redactContent, &$summary) {
            $ticketIds = Ticket::withTrashed()->where('customer_id', $customer->id)->pluck('id');
            $summary['tickets'] = $ticketIds->count();

            if ($redactContent && $ticketIds->isNotEmpty()) {
                // Files first: the database row is the only record of where the file is.
                TicketAttachment::withTrashed()->whereIn('ticket_id', $ticketIds)->get()->each(function (TicketAttachment $a) use (&$summary) {
                    Storage::disk($a->disk)->delete($a->path);
                    $a->forceDelete();
                    $summary['attachments_removed']++;
                });

                $summary['messages_redacted'] = TicketMessage::withTrashed()->whereIn('ticket_id', $ticketIds)->update(['body' => self::REDACTED_TEXT]);

                Ticket::withTrashed()->whereIn('id', $ticketIds)->get()->each(
                    fn (Ticket $t) => $t->forceFill(['subject' => '[Removed] '.$t->ticket_number, 'description' => self::REDACTED_TEXT])->saveQuietly()
                );

                TicketActivity::whereIn('ticket_id', $ticketIds)->update(['description' => 'Activity removed', 'meta' => null]);

                AuditLog::whereIn('auditable_type', [(new Ticket)->getMorphClass(), (new TicketMessage)->getMorphClass()])
                    ->whereIn('auditable_id', $ticketIds->all())
                    ->update(['old_values' => null, 'new_values' => null]);
            }

            if ($user) {
                // The account and customer record themselves are always anonymized.
                AuditLog::whereIn('auditable_type', [$user->getMorphClass(), $customer->getMorphClass()])
                    ->whereIn('auditable_id', [$user->id, $customer->id])
                    ->update(['old_values' => null, 'new_values' => null, 'ip_address' => null, 'user_agent' => null]);

                AuditLog::where('actor_id', $user->id)->update(['ip_address' => null, 'user_agent' => null]);

                $user->tokens()->delete();
                $user->forceFill([
                    'name' => 'Erased customer',
                    'email' => "erased-{$user->id}@erased.invalid",
                    'phone' => null,
                    'avatar_path' => null,
                    'password' => Hash::make(Str::random(64)),
                    'is_active' => false,
                    'email_verified_at' => null,
                    'remember_token' => null,
                    'two_factor_secret' => null,
                    'two_factor_recovery_codes' => null,
                    'two_factor_confirmed_at' => null,
                ])->save();
            }

            if ($oldEmail) {
                InboundEmail::where('from_email', $oldEmail)->update(['from_email' => 'erased@erased.invalid', 'from_name' => null, 'subject' => null]);
            }

            $customer->forceFill(['company_name' => null, 'phone' => null, 'external_id' => null])->save();
            $customer->delete();
            $user?->delete();
        });

        // The audit entry names the customer only by id: it must not bring the identity back.
        $this->audit->log('customer.erased', null, null, ['customer_id' => $customer->id] + $summary, $actor);

        return $summary;
    }
}
