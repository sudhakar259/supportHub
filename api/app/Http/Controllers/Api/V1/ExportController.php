<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Ticket;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * @group Exports
 *
 * CSV downloads of a workspace's own data, for spreadsheets, backups and moving elsewhere.
 * Both stream row by row, so a large workspace does not run out of memory.
 */
class ExportController extends Controller
{
    /**
     * Export tickets (CSV)
     *
     * One row per ticket you are allowed to see. Requires `reports.view`.
     *
     * @queryParam from date Only tickets created on or after this date. Example: 2026-01-01
     * @queryParam to date Only tickets created on or before this date. Example: 2026-12-31
     *
     * @response 200 scenario="CSV file download" ticket_number,subject,status,priority,category,department,assignee,customer_name,customer_email,tags,created_at,first_response_at,resolved_at,closed_at
     */
    public function tickets(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user->isCustomer() || ! $user->can('reports.view'), 403, 'You do not have permission to perform this action.');

        $range = $request->validate(['from' => ['nullable', 'date'], 'to' => ['nullable', 'date']]);

        $query = Ticket::query()
            ->accessibleTo($user)
            ->when($range['from'] ?? null, fn ($q, $from) => $q->where('created_at', '>=', $from))
            ->when($range['to'] ?? null, fn ($q, $to) => $q->where('created_at', '<=', $to.' 23:59:59'))
            ->with(['status', 'priority', 'category', 'department', 'assignee', 'customer.user', 'tags'])
            ->orderBy('created_at')
            ->orderBy('id');

        app(AuditLogger::class)->log('export.tickets', null, null, ['from' => $range['from'] ?? null, 'to' => $range['to'] ?? null], $user);

        return $this->csv('tickets-'.now()->format('Ymd').'.csv', [
            'ticket_number', 'subject', 'status', 'priority', 'category', 'department', 'assignee',
            'customer_name', 'customer_email', 'tags', 'created_at', 'first_response_at', 'resolved_at', 'closed_at',
        ], function (callable $write) use ($query) {
            $query->chunk(500, function ($tickets) use ($write) {
                foreach ($tickets as $t) {
                    $write([
                        $t->ticket_number, $t->subject, $t->status?->name, $t->priority?->name, $t->category?->name,
                        $t->department?->name, $t->assignee?->name, $t->customer?->user?->name, $t->customer?->user?->email,
                        $t->tags->pluck('name')->sort()->implode('; '),
                        $t->created_at?->toIso8601String(), $t->first_response_at?->toIso8601String(),
                        $t->resolved_at?->toIso8601String(), $t->closed_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    /**
     * Export customers (CSV)
     *
     * One row per customer. Requires `customers.view`.
     *
     * @response 200 scenario="CSV file download" name,email,phone,company_name,customer_type,external_id,created_at
     */
    public function customers(Request $request): StreamedResponse
    {
        $user = $request->user();
        abort_if($user->isCustomer() || ! $user->can('customers.view'), 403, 'You do not have permission to perform this action.');

        app(AuditLogger::class)->log('export.customers', null, null, null, $user);

        return $this->csv('customers-'.now()->format('Ymd').'.csv', [
            'name', 'email', 'phone', 'company_name', 'customer_type', 'external_id', 'created_at',
        ], function (callable $write) {
            Customer::with('user')->orderBy('id')->chunk(500, function ($customers) use ($write) {
                foreach ($customers as $c) {
                    $write([
                        $c->user?->name, $c->user?->email, $c->phone ?? $c->user?->phone, $c->company_name,
                        $c->customer_type, $c->external_id, $c->created_at?->toIso8601String(),
                    ]);
                }
            });
        });
    }

    /** @param callable(callable(array): void): void $rows */
    private function csv(string $filename, array $header, callable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // so Excel reads it as UTF-8
            fputcsv($out, $header);
            $rows(fn (array $row) => fputcsv($out, array_map([$this, 'safeCell'], $row)));
            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * A customer controls the subject line, and a spreadsheet runs a cell that starts with
     * = + - @ as a formula. Prefixing a quote makes it plain text (CSV injection).
     */
    public function safeCell(mixed $value): string
    {
        $text = (string) ($value ?? '');

        return $text !== '' && in_array($text[0], ['=', '+', '-', '@', "\t", "\r"], true) ? "'".$text : $text;
    }
}
