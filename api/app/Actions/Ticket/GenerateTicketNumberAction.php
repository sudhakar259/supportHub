<?php

namespace App\Actions\Ticket;

use App\Models\Department;
use App\Models\TicketNumberSequence;
use App\Models\TicketNumberSetting;
use Illuminate\Database\QueryException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;

/**
 * Generates the next public ticket number under the active
 * TicketNumberSetting, concurrency-safe via a row-level lock on the
 * relevant TicketNumberSequence. Two concurrent ticket creations can
 * never receive the same number: the sequence is incremented before it
 * is read, inside one transaction, so the first statement takes the
 * write lock and a second caller waits until the first commits.
 *
 * Changing the settings does not touch previously generated numbers —
 * each setting has its own sequences, keyed by (settings_id, period_key).
 */
class GenerateTicketNumberAction
{
    public function execute(?int $departmentId = null): string
    {
        $settings = $this->resolveSettings($departmentId);
        $periodKey = $this->periodKey($settings->reset_period);

        $nextNumber = $this->retrying(function () use ($settings, $periodKey) {
            return DB::transaction(function () use ($settings, $periodKey) {
                $sequence = fn () => TicketNumberSequence::query()
                    ->where('ticket_number_settings_id', $settings->id)
                    ->where('period_key', $periodKey);

                if ($sequence()->increment('last_number') === 0) {
                    TicketNumberSequence::create([
                        'ticket_number_settings_id' => $settings->id,
                        'period_key' => $periodKey,
                        'last_number' => $settings->starting_number - 1,
                    ]);

                    $sequence()->increment('last_number');
                }

                return $sequence()->value('last_number');
            });
        });

        return $this->format($settings, $nextNumber, $departmentId);
    }

    protected function resolveSettings(?int $departmentId): TicketNumberSetting
    {
        $settings = null;

        if ($departmentId) {
            $settings = TicketNumberSetting::query()
                ->where('department_id', $departmentId)
                ->where('is_active', true)
                ->orderByDesc('effective_from')
                ->first();
        }

        return $settings ?? TicketNumberSetting::query()
            ->whereNull('department_id')
            ->where('is_active', true)
            ->orderByDesc('effective_from')
            ->firstOrFail();
    }

    protected function periodKey(string $resetPeriod): string
    {
        return match ($resetPeriod) {
            'yearly' => now()->format('Y'),
            'monthly' => now()->format('Y-m'),
            'daily' => now()->format('Y-m-d'),
            default => 'all',
        };
    }

    protected function format(TicketNumberSetting $settings, int $number, ?int $departmentId): string
    {
        $department = $departmentId ? Department::find($departmentId) : null;

        $replacements = [
            '{prefix}' => $settings->prefix,
            '{number}' => str_pad((string) $number, $settings->number_length, '0', STR_PAD_LEFT),
            '{year}' => now()->format('Y'),
            '{month}' => now()->format('m'),
            '{day}' => now()->format('d'),
            '{department}' => $department ? strtoupper(str_replace(' ', '', $department->name)) : 'GENERAL',
            '{department_code}' => $department->code ?? 'GEN',
        ];

        return strtr($settings->format, $replacements);
    }

    /**
     * Retries on transient contention only: a genuine unique-constraint
     * race (two requests both INSERTing the first row for a brand-new
     * period at the same instant) or a lock/deadlock timeout surfaced by
     * the database under heavy concurrency. Anything else propagates
     * immediately — this is not a general-purpose retry-everything loop.
     */
    protected function retrying(callable $callback, int $attempts = 8): mixed
    {
        $lastException = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            try {
                return $callback();
            } catch (UniqueConstraintViolationException $e) {
                $lastException = $e;
            } catch (QueryException $e) {
                if (! $this->isTransientLockError($e)) {
                    throw $e;
                }

                $lastException = $e;
            }

            usleep(random_int(5, 50) * 1000);
        }

        throw $lastException;
    }

    protected function isTransientLockError(QueryException $e): bool
    {
        $message = $e->getMessage();

        return str_contains($message, 'database is locked')
            || str_contains($message, 'Deadlock')
            || str_contains($message, 'Lock wait timeout');
    }
}
