<?php

namespace App\Services;

use App\Models\BusinessHours;
use Carbon\CarbonImmutable;

/**
 * Adds N minutes of "business time" to a timestamp, skipping time
 * outside the configured weekly schedule (used by CalculateSlaAction
 * when an SLA policy has business_hours_only = true).
 */
class BusinessHoursCalculator
{
    private const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    public function addBusinessMinutes(CarbonImmutable $start, int $minutes, BusinessHours $businessHours): CarbonImmutable
    {
        $cursor = $start->setTimezone($businessHours->timezone);
        $remaining = $minutes;
        $schedule = $businessHours->schedule ?? [];

        // 400 days is a generous ceiling against a misconfigured schedule
        // (e.g. every day empty) looping forever.
        for ($daysChecked = 0; $daysChecked < 400 && $remaining > 0; $daysChecked++) {
            $dayName = self::DAY_NAMES[(int) $cursor->format('w')];
            $windows = $schedule[$dayName] ?? [];

            foreach ($windows as $window) {
                $windowStart = $cursor->setTimeFromTimeString($window['start']);
                $windowEnd = $cursor->setTimeFromTimeString($window['end']);

                if ($cursor->greaterThanOrEqualTo($windowEnd)) {
                    continue;
                }

                $segmentStart = $cursor->greaterThan($windowStart) ? $cursor : $windowStart;
                $availableMinutes = $segmentStart->diffInMinutes($windowEnd);

                if ($availableMinutes >= $remaining) {
                    return $segmentStart->addMinutes($remaining)->setTimezone('UTC');
                }

                $remaining -= $availableMinutes;
                $cursor = $windowEnd;
            }

            $cursor = $cursor->addDay()->startOfDay();
        }

        // Schedule never had enough business time in the lookahead window;
        // fall back to calendar time rather than hanging indefinitely.
        return $cursor->addMinutes($remaining)->setTimezone('UTC');
    }
}
