<?php

use App\Support\SentryScrubber;
use Sentry\Event;
use Sentry\ExceptionDataBag;

function scrubbed(array $request = [], ?string $exceptionMessage = null, ?string $message = null): Event
{
    $event = Event::createEvent();
    $event->setRequest($request);
    if ($exceptionMessage !== null) {
        $event->setExceptions([new ExceptionDataBag(new RuntimeException($exceptionMessage))]);
    }
    if ($message !== null) {
        $event->setMessage($message);
    }

    return SentryScrubber::beforeSend($event);
}

it('removes credentials from request headers but keeps harmless ones', function () {
    $event = scrubbed(['headers' => [
        'Authorization' => ['Bearer 12|abcdefghijklmnopqrstuvwxyz0123456789'],
        'Cookie' => ['session=abc'],
        'X-Api-Key' => ['ak_abcdef1234567890'],
        'X-Api-Secret' => ['as_abcdef1234567890abcdef'],
        'X-Webhook-Signature' => ['deadbeef'],
        'User-Agent' => ['Mozilla/5.0'],
        'Accept' => ['application/json'],
    ]]);

    expect(array_keys($event->getRequest()['headers']))->toBe(['User-Agent', 'Accept']);
});

it('drops the request body, cookies and query string, keeping only the path', function () {
    $event = scrubbed([
        'url' => 'https://api.example.com/api/v1/auth/reset-password?token=SECRET&email=a@b.com',
        'query_string' => 'token=SECRET&email=a@b.com',
        'data' => ['password' => 'hunter2', 'body' => 'my card is 4242'],
        'cookies' => ['a' => 'b'],
        'method' => 'POST',
    ]);
    $request = $event->getRequest();

    expect($request['url'])->toBe('https://api.example.com/api/v1/auth/reset-password')
        ->and($request)->not->toHaveKeys(['query_string', 'data', 'cookies'])
        ->and($request['method'])->toBe('POST');
});

it('redacts customers\' emails and tokens inside error messages, such as a database error with its SQL values', function () {
    $event = scrubbed(exceptionMessage: "SQLSTATE[23000]: Duplicate entry 'jamie@example.com' for key 'users_email' (Connection: mysql) with token 12|abcdefghijklmnopqrstuvwxyz0123456789 and key ak_abcdef1234567890");
    $value = $event->getExceptions()[0]->getValue();

    expect($value)->toContain('Duplicate entry')->toContain('[email]')->toContain('[token]')->toContain('[secret]')
        ->not->toContain('jamie@example.com')->not->toContain('abcdefghijklmnopqrstuvwxyz0123456789')->not->toContain('ak_abcdef');
});

it('redacts the same things in plain messages and links', function () {
    $event = scrubbed(message: 'Reset failed for https://app.example.com/reset-password?token=abc123&email=x@y.org, header Bearer abcdefghijklmnop1234');

    expect($event->getMessage())->toContain('token=[redacted]')->toContain('[email]')->toContain('Bearer [token]')
        ->not->toContain('abc123')->not->toContain('x@y.org');
});

it('leaves ordinary text alone and copes with empty values', function () {
    expect(SentryScrubber::redact('Cannot transition a ticket from "open" to "closed".'))->toBe('Cannot transition a ticket from "open" to "closed".')
        ->and(SentryScrubber::redact(''))->toBe('')
        ->and(SentryScrubber::redact(null))->toBeNull();
});

it('is the configured before_send handler, and Sentry sends nothing by default', function () {
    expect(config('sentry.before_send'))->toBe([SentryScrubber::class, 'beforeSend'])
        ->and(config('sentry.send_default_pii'))->toBeFalse()
        ->and(config('sentry.dsn'))->toBeEmpty()
        ->and(config('sentry.breadcrumbs.logs'))->toBeFalse();
});
