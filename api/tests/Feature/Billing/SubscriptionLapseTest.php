<?php

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

const LAPSE_RAZORPAY_BASE = 'https://api.razorpay.test/v1';

beforeEach(function () {
    $this->seed([RolesAndPermissionsSeeder::class]);
    testTenant();
    $this->seed([MembershipPlanSeeder::class]);

    config([
        'services.razorpay.base_url' => LAPSE_RAZORPAY_BASE,
        'services.razorpay.key_id' => 'rzp_test_key',
        'services.razorpay.key_secret' => 'test_secret',
    ]);

    Http::fake([LAPSE_RAZORPAY_BASE.'/orders' => Http::response(['id' => 'order_LAPSE', 'amount' => 4900, 'currency' => 'USD'], 200)]);
});

function lapseSubscription(string $status, ?DateTimeInterface $periodEnds, string $planSlug = 'professional'): Subscription
{
    return Subscription::create([
        'tenant_id' => testTenant()->id,
        'membership_plan_id' => MembershipPlan::where('slug', $planSlug)->firstOrFail()->id,
        'status' => $status,
        'current_period_ends_at' => $periodEnds,
    ]);
}

it('moves an unpaid paid period from active to past_due', function () {
    $subscription = lapseSubscription('active', now()->subHours(2));

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('past_due');
});

it('suspends a past_due subscription once the grace period has passed', function () {
    $subscription = lapseSubscription('past_due', now()->subDays(8));

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('suspended');
});

it('moves a far-overdue active subscription straight to suspended', function () {
    $subscription = lapseSubscription('active', now()->subDays(10));

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('suspended');
});

it('expires a suspended subscription after the suspension window', function () {
    $subscription = lapseSubscription('suspended', now()->subDays(40));

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('expired');
});

it('expires a trial that ended without a payment', function () {
    $subscription = lapseSubscription('trial', null);
    $subscription->update(['trial_ends_at' => now()->subDay()]);

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('expired');
});

it('never moves a lapsed subscription backwards', function () {
    $subscription = lapseSubscription('suspended', now()->subDays(2));

    Artisan::call('billing:enforce-lapses');

    expect($subscription->fresh()->status)->toBe('suspended');
});

it('leaves a free plan untouched', function () {
    $starter = lapseSubscription('active', null, 'starter');

    Artisan::call('billing:enforce-lapses');

    expect($starter->fresh()->status)->toBe('active');
});

it('leaves a paid subscription with time left untouched', function () {
    $current = lapseSubscription('active', now()->addDays(5));

    Artisan::call('billing:enforce-lapses');

    expect($current->fresh()->status)->toBe('active');
});

it('records each lapse in the audit log', function () {
    lapseSubscription('active', now()->subHours(2));

    Artisan::call('billing:enforce-lapses');

    $entry = AuditLog::where('action', 'subscription.lapsed')->firstOrFail();
    expect($entry->old_values)->toBe(['status' => 'active']);
    expect($entry->new_values)->toBe(['status' => 'past_due']);
});

it('tells a suspended tenant the access is suspended for non-payment, while billing stays reachable', function () {
    lapseSubscription('suspended', now()->subDays(10));
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(402)
        ->assertJsonPath('message', 'Your subscription is suspended for non-payment. Pay the renewal invoice to restore access.');

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/subscription/invoices')
        ->assertOk();
});

it('blocks a past_due tenant workspace with the renewal message', function () {
    lapseSubscription('past_due', now()->subDay());
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(402)
        ->assertJsonPath('message', 'Your subscription period has ended. Pay the renewal invoice to continue.');
});

it('blocks an expired tenant workspace', function () {
    lapseSubscription('expired', now()->subDays(60));
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(402)
        ->assertJsonPath('message', 'Your access has expired. Choose a plan or pay the outstanding invoice to continue.');
});

it('restores a suspended subscription when its renewal invoice is paid', function () {
    $subscription = lapseSubscription('suspended', now()->subDays(10));
    Invoice::create([
        'tenant_id' => testTenant()->id,
        'subscription_id' => $subscription->id,
        'membership_plan_id' => $subscription->membership_plan_id,
        'amount_cents' => 4900,
        'currency' => 'USD',
        'billing_interval' => 'monthly',
        'status' => 'pending',
        'razorpay_order_id' => 'order_LAPSE',
    ]);
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/subscription/payments/verify', [
            'razorpay_order_id' => 'order_LAPSE',
            'razorpay_payment_id' => 'pay_lapse',
            'razorpay_signature' => hash_hmac('sha256', 'order_LAPSE|pay_lapse', 'test_secret'),
        ])
        ->assertOk();

    $subscription->refresh();
    expect($subscription->status)->toBe('active');
    expect($subscription->current_period_ends_at->isFuture())->toBeTrue();
});

it('does not grant a new trial when a lapsed tenant changes plan', function () {
    lapseSubscription('suspended', now()->subDays(10));
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/subscription', ['plan' => 'business'])
        ->assertOk()
        ->assertJsonPath('data.status', 'suspended');

    $subscription = Subscription::where('tenant_id', testTenant()->id)->firstOrFail();
    expect($subscription->trial_ends_at)->toBeNull();
    expect($subscription->plan->slug)->toBe('business');
});

it('still starts a trial when a paid subscription in good standing changes plan', function () {
    lapseSubscription('active', now()->addDays(10));
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/subscription', ['plan' => 'business'])
        ->assertOk()
        ->assertJsonPath('data.status', 'trial');
});
