<?php

use App\Models\User;
use Illuminate\Auth\Events\Verified;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;

it('verifies email via a valid signed link', function () {
    Event::fake([Verified::class]);

    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1($user->getEmailForVerification()),
    ]);

    $this->getJson($url)
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Email verified successfully.');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
    Event::assertDispatched(Verified::class);
});

it('rejects a verification link with a tampered hash', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1('not-the-right-email'),
    ]);

    $this->getJson($url)->assertStatus(403);

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

it('rejects an expired or unsigned verification link', function () {
    $user = User::factory()->unverified()->create();

    $this->getJson("/api/v1/auth/email/verify/{$user->id}/".sha1($user->email))
        ->assertStatus(403);
});

it('allows an authenticated unverified user to resend the verification email', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user, 'api')
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'Verification link sent.');
});

it('tells an already-verified user their email is already verified', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'api')
        ->postJson('/api/v1/auth/email/verification-notification')
        ->assertOk()
        ->assertJsonPath('message', 'Email already verified.');
});

it('sends a browser that opens the emailed link to the app instead of showing JSON', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->addMinutes(60), [
        'id' => $user->id,
        'hash' => sha1($user->getEmailForVerification()),
    ]);

    $response = $this->get($url)->assertRedirect();

    expect($response->headers->get('Location'))->toEndWith('/email-verification?verified=1');
    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

it('sends a browser with an expired link to the app with a reason, and verifies nothing', function () {
    $user = User::factory()->unverified()->create();

    $url = URL::temporarySignedRoute('verification.verify', now()->subMinute(), [
        'id' => $user->id,
        'hash' => sha1($user->getEmailForVerification()),
    ]);

    $response = $this->get($url)->assertRedirect();

    expect($response->headers->get('Location'))->toEndWith('/email-verification?verified=0&reason=expired');
    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});
