<?php

use App\Events\TicketCreated;
use App\Events\TicketResolved;

it('registers each ticket listener exactly once', function () {
    // Notification + webhook. Framework discovery used to add a second copy of each.
    expect(app('events')->getListeners(TicketCreated::class))->toHaveCount(2);
    expect(app('events')->getListeners(TicketResolved::class))->toHaveCount(2);
});
