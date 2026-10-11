<?php

use App\Support\Totp;

// RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (the 8-digit values there, cut to 6 digits).
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

it('produces the codes published in RFC 6238', function (int $time, string $expected) {
    expect(Totp::code(RFC_SECRET, Totp::currentStep($time)))->toBe($expected);
})->with([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
]);

it('round-trips base32 and generates a 32-character secret', function () {
    expect(Totp::base32Encode('12345678901234567890'))->toBe(RFC_SECRET)
        ->and(Totp::base32Decode(RFC_SECRET))->toBe('12345678901234567890')
        ->and(Totp::generateSecret())->toMatch('/^[A-Z2-7]{32}$/');
});

it('accepts a code from the previous, current or next step, but not further away', function () {
    $now = 1234567890;
    $step = Totp::currentStep($now);

    foreach ([$step - 1, $step, $step + 1] as $s) {
        expect(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $s), null, $now))->toBe($s);
    }
    expect(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $step - 2), null, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $step + 2), null, $now))->toBeNull();
});

it('refuses a code whose step was already used, or is older than the last used', function () {
    $now = 1234567890;
    $step = Totp::currentStep($now);

    expect(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $step), $step, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $step - 1), $step, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, Totp::code(RFC_SECRET, $step + 1), $step, $now))->toBe($step + 1);
});

it('rejects malformed codes and tolerates spaces', function () {
    $now = 1234567890;
    $code = Totp::code(RFC_SECRET, Totp::currentStep($now));

    expect(Totp::verify(RFC_SECRET, '12345', null, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, 'abcdef', null, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, '', null, $now))->toBeNull()
        ->and(Totp::verify(RFC_SECRET, substr($code, 0, 3).' '.substr($code, 3), null, $now))->not->toBeNull();
});

it('builds the link an authenticator app reads', function () {
    $uri = Totp::uri('Support Hub', 'me@example.com', 'ABC234');

    expect($uri)->toBe('otpauth://totp/Support%20Hub:me%40example.com?secret=ABC234&issuer=Support%20Hub&algorithm=SHA1&digits=6&period=30');
});
