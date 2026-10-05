<?php

use App\Models\Invoice;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Http;

const RAZORPAY_TEST_BASE = 'https://api.razorpay.test/v1';

beforeEach(function () {
    $this->seed([RolesAndPermissionsSeeder::class]);
    testTenant();
    $this->seed([MembershipPlanSeeder::class]);

    config([
        'services.razorpay.base_url' => RAZORPAY_TEST_BASE,
        'services.razorpay.key_id' => 'rzp_test_key',
        'services.razorpay.key_secret' => 'test_secret',
        'services.razorpay.webhook_secret' => 'whsec_test',
    ]);

    $starter = MembershipPlan::where('slug', 'starter')->firstOrFail();
    Subscription::create(['tenant_id' => testTenant()->id, 'membership_plan_id' => $starter->id, 'status' => 'active']);
});

function fakeRazorpayOrder(string $orderId = 'order_ABC'): void
{
    Http::fake([RAZORPAY_TEST_BASE.'/orders' => Http::response(['id' => $orderId, 'amount' => 4900, 'currency' => 'USD'], 200)]);
}

function razorpayWebhookBody(string $event, array $entity): string
{
    return json_encode(['event' => $event, 'payload' => ['payment' => ['entity' => $entity]]], JSON_THROW_ON_ERROR);
}

it('issues a pending invoice with a Razorpay order when a tenant moves to a paid plan', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/subscription', ['plan' => 'professional'])
        ->assertOk()
        ->assertJsonPath('data.invoice.status', 'pending')
        ->assertJsonPath('data.invoice.checkout.order_id', 'order_ABC')
        ->assertJsonPath('data.invoice.checkout.key_id', 'rzp_test_key');

    Http::assertSent(fn ($request) => $request->url() === RAZORPAY_TEST_BASE.'/orders'
        && $request['amount'] === 4900
        && $request['currency'] === 'USD');

    expect(Invoice::where('razorpay_order_id', 'order_ABC')->where('status', 'pending')->exists())->toBeTrue();
});

it('changes nothing when the payment provider cannot create the order', function () {
    Http::fake([RAZORPAY_TEST_BASE.'/orders' => Http::response(['error' => 'down'], 500)]);
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/subscription', ['plan' => 'professional'])
        ->assertStatus(503);

    expect(Subscription::where('tenant_id', testTenant()->id)->first()->plan->slug)->toBe('starter');
    expect(Invoice::count())->toBe(0);
});

it('refuses paid plan changes when payments are not configured', function () {
    config(['services.razorpay.key_id' => null, 'services.razorpay.key_secret' => null]);
    Http::fake();
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')
        ->putJson('/api/v1/subscription', ['plan' => 'professional'])
        ->assertStatus(503)
        ->assertJsonPath('message', 'Online payments are not configured for this environment.');

    Http::assertNothingSent();
});

it('activates the subscription for one billing period once a correctly signed payment is confirmed', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();

    $signature = hash_hmac('sha256', 'order_ABC|pay_123', 'test_secret');

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/subscription/payments/verify', [
            'razorpay_order_id' => 'order_ABC',
            'razorpay_payment_id' => 'pay_123',
            'razorpay_signature' => $signature,
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'paid');

    $subscription = Subscription::where('tenant_id', testTenant()->id)->first();
    expect($subscription->status)->toBe('active');
    expect($subscription->trial_ends_at)->toBeNull();
    expect($subscription->current_period_ends_at->isBetween(now()->addDays(27), now()->addDays(32)))->toBeTrue();
});

it('rejects a payment confirmation whose signature does not match', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/subscription/payments/verify', [
            'razorpay_order_id' => 'order_ABC',
            'razorpay_payment_id' => 'pay_123',
            'razorpay_signature' => 'forged',
        ])
        ->assertStatus(422);

    expect(Invoice::where('razorpay_order_id', 'order_ABC')->value('status'))->toBe('pending');
});

it('settles an invoice from a verified webhook exactly once, even if it is delivered twice', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();

    $body = razorpayWebhookBody('payment.captured', ['id' => 'pay_hook', 'order_id' => 'order_ABC']);
    $signature = hash_hmac('sha256', $body, 'whsec_test');

    for ($i = 0; $i < 2; $i++) {
        $this->call('POST', '/api/v1/billing/razorpay/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_RAZORPAY_SIGNATURE' => $signature,
        ], $body)->assertOk();
    }

    $invoice = Invoice::where('razorpay_order_id', 'order_ABC')->first();
    expect($invoice->status)->toBe('paid');
    expect($invoice->razorpay_payment_id)->toBe('pay_hook');
    expect(Subscription::where('tenant_id', testTenant()->id)->first()->status)->toBe('active');
});

it('ignores a webhook with an invalid signature', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();

    $body = razorpayWebhookBody('payment.captured', ['id' => 'pay_hook', 'order_id' => 'order_ABC']);

    $this->call('POST', '/api/v1/billing/razorpay/webhook', [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_RAZORPAY_SIGNATURE' => 'not-the-signature',
    ], $body)->assertStatus(400);

    expect(Invoice::where('razorpay_order_id', 'order_ABC')->value('status'))->toBe('pending');
});

it('voids the earlier unpaid invoice when the plan is changed again', function () {
    Http::fake([RAZORPAY_TEST_BASE.'/orders' => Http::sequence()
        ->push(['id' => 'order_FIRST'], 200)
        ->push(['id' => 'order_SECOND'], 200)]);
    $admin = actingAsAdministrator();

    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'business'])->assertOk();

    expect(Invoice::where('razorpay_order_id', 'order_FIRST')->value('status'))->toBe('void');
    expect(Invoice::where('razorpay_order_id', 'order_SECOND')->value('status'))->toBe('pending');
});

it('lists invoices for a user who can view billing', function () {
    fakeRazorpayOrder();
    $admin = actingAsAdministrator();
    $this->actingAs($admin, 'api')->putJson('/api/v1/subscription', ['plan' => 'professional'])->assertOk();

    $this->actingAs($admin, 'api')
        ->getJson('/api/v1/subscription/invoices')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.number', 'INV-'.str_pad((string) Invoice::value('id'), 6, '0', STR_PAD_LEFT));
});
