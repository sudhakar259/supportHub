<?php

use App\Models\Invoice;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

const RENEWAL_RAZORPAY_BASE = 'https://api.razorpay.test/v1';

beforeEach(function () {
    $this->seed([RolesAndPermissionsSeeder::class]);
    testTenant();
    $this->seed([MembershipPlanSeeder::class]);

    config([
        'services.razorpay.base_url' => RENEWAL_RAZORPAY_BASE,
        'services.razorpay.key_id' => 'rzp_test_key',
        'services.razorpay.key_secret' => 'test_secret',
    ]);

    Http::fake([RENEWAL_RAZORPAY_BASE.'/orders' => Http::response(['id' => 'order_RENEW', 'amount' => 4900, 'currency' => 'USD'], 200)]);
});

function paidSubscription(DateTimeInterface $periodEnds): Subscription
{
    $professional = MembershipPlan::where('slug', 'professional')->firstOrFail();

    return Subscription::create([
        'tenant_id' => testTenant()->id,
        'membership_plan_id' => $professional->id,
        'status' => 'active',
        'current_period_ends_at' => $periodEnds,
    ]);
}

it('issues one renewal invoice for a paid subscription whose period ends within three days', function () {
    paidSubscription(now()->addDays(2));

    Artisan::call('billing:issue-renewals');
    Artisan::call('billing:issue-renewals');

    expect(Invoice::where('status', 'pending')->count())->toBe(1);
    expect(Invoice::where('razorpay_order_id', 'order_RENEW')->exists())->toBeTrue();
});

it('does not renew a free plan or a subscription that has time left', function () {
    $starter = MembershipPlan::where('slug', 'starter')->firstOrFail();
    Subscription::create(['tenant_id' => testTenant()->id, 'membership_plan_id' => $starter->id, 'status' => 'active', 'current_period_ends_at' => now()->addDays(2)]);

    Artisan::call('billing:issue-renewals');

    expect(Invoice::count())->toBe(0);
    Http::assertNothingSent();
});

it('blocks tenant routes once a paid period has lapsed, but keeps billing reachable', function () {
    paidSubscription(now()->subDay());
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/tickets')
        ->assertStatus(402)
        ->assertJsonPath('message', 'Your subscription period has ended. Pay the renewal invoice to continue.');

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/subscription')
        ->assertOk();
});

it('extends the period from its current end when a renewal is paid early', function () {
    $periodEnds = now()->addDays(2)->startOfSecond();
    paidSubscription($periodEnds);
    Artisan::call('billing:issue-renewals');

    $admin = actingAsAdministrator();
    $signature = hash_hmac('sha256', 'order_RENEW|pay_renew', 'test_secret');

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/subscription/payments/verify', [
            'razorpay_order_id' => 'order_RENEW',
            'razorpay_payment_id' => 'pay_renew',
            'razorpay_signature' => $signature,
        ])
        ->assertOk();

    $newEnd = Subscription::where('tenant_id', testTenant()->id)->first()->current_period_ends_at;
    expect($newEnd->isBetween($periodEnds->copy()->addMonth()->subMinute(), $periodEnds->copy()->addMonth()->addMinute()))->toBeTrue();
});
