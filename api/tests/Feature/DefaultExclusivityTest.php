<?php

use App\Models\TicketPriority;
use App\Models\TicketStatus;

beforeEach(fn () => testTenant());

// QA regression (2026-10-01): nothing previously stopped two rows from both
// being is_default=true; TicketPriority::default()/TicketStatus::default()
// (used whenever a ticket is created without an explicit priority/status)
// would then non-deterministically return "whichever the DB returns
// first." HasExclusiveDefault demotes the previous default automatically.
it('demotes the previous default priority when a new one is marked default', function () {
    $first = TicketPriority::create(['name' => 'Low', 'slug' => 'low-'.uniqid(), 'level' => 1, 'is_default' => true]);
    $second = TicketPriority::create(['name' => 'High', 'slug' => 'high-'.uniqid(), 'level' => 2, 'is_default' => true]);

    expect($first->fresh()->is_default)->toBeFalse();
    expect($second->fresh()->is_default)->toBeTrue();
    expect(TicketPriority::where('is_default', true)->count())->toBe(1);
    expect(TicketPriority::default()->id)->toBe($second->id);
});

it('demotes the previous default status when a new one is marked default', function () {
    $first = TicketStatus::create(['name' => 'Alpha', 'slug' => 'alpha-'.uniqid(), 'is_default' => true]);
    $second = TicketStatus::create(['name' => 'Beta', 'slug' => 'beta-'.uniqid(), 'is_default' => true]);

    expect($first->fresh()->is_default)->toBeFalse();
    expect($second->fresh()->is_default)->toBeTrue();
    expect(TicketStatus::where('is_default', true)->count())->toBe(1);
});
