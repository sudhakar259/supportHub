<?php

use App\Models\BusinessHours;
use App\Services\BusinessHoursCalculator;
use Carbon\CarbonImmutable;

beforeEach(function () {
    $this->calculator = new BusinessHoursCalculator;

    $weekday = [['start' => '09:00', 'end' => '17:00']];

    $this->businessHours = new BusinessHours([
        'name' => 'Standard',
        'timezone' => 'UTC',
        'schedule' => [
            'monday' => $weekday,
            'tuesday' => $weekday,
            'wednesday' => $weekday,
            'thursday' => $weekday,
            'friday' => $weekday,
            'saturday' => [],
            'sunday' => [],
        ],
    ]);
});

it('adds minutes within the same business window', function () {
    $start = CarbonImmutable::parse('2026-10-05 10:00:00', 'UTC'); // Monday

    $result = $this->calculator->addBusinessMinutes($start, 120, $this->businessHours);

    expect($result->format('Y-m-d H:i'))->toBe('2026-10-05 12:00');
});

it('rolls over to the next business day when minutes exceed the remaining window', function () {
    $start = CarbonImmutable::parse('2026-10-05 16:00:00', 'UTC'); // Monday 4pm, 1h left today

    $result = $this->calculator->addBusinessMinutes($start, 180, $this->businessHours); // needs 3h

    // 1h consumed Monday (16:00-17:00), 2h consumed Tuesday from 09:00 -> 11:00
    expect($result->format('Y-m-d H:i'))->toBe('2026-10-06 11:00');
});

it('skips the weekend entirely', function () {
    $start = CarbonImmutable::parse('2026-10-09 16:00:00', 'UTC'); // Friday 4pm, 1h left today

    $result = $this->calculator->addBusinessMinutes($start, 120, $this->businessHours); // needs 2h

    // 1h Friday (16:00-17:00), 1h Monday from 09:00 -> 10:00
    expect($result->format('Y-m-d H:i'))->toBe('2026-10-12 10:00');
});

it('jumps forward to the start of the window when the start time is before business hours', function () {
    $start = CarbonImmutable::parse('2026-10-05 06:00:00', 'UTC'); // Monday, before 09:00

    $result = $this->calculator->addBusinessMinutes($start, 30, $this->businessHours);

    expect($result->format('Y-m-d H:i'))->toBe('2026-10-05 09:30');
});
