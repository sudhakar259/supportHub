<?php

return [
    // Account lockout: this many wrong passwords (or wrong two-factor codes) in a row
    // lock the account for the given number of minutes. Success, an administrator
    // unlocking it, or a password reset clears the count.
    'lockout_max_attempts' => (int) env('LOCKOUT_MAX_ATTEMPTS', 5),
    'lockout_minutes' => (int) env('LOCKOUT_MINUTES', 15),

    // Shown as the account name in authenticator apps.
    'two_factor_issuer' => env('TWO_FACTOR_ISSUER', env('APP_NAME', 'DeskNu')),

    // How long a password-verified sign-in may wait for its two-factor code.
    'two_factor_challenge_minutes' => 5,
    'recovery_code_count' => 8,
];
