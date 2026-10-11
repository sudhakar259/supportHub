<?php

/**
 * Email-to-ticket (Mailgun inbound routing). Each workspace receives mail at
 * {tenant-slug}@{domain}; see docs/email-to-ticket.md for the Mailgun setup.
 */
return [
    // Domain whose MX records point at Mailgun, e.g. inbound.example.com. Leave
    // empty to switch the feature off for the whole platform.
    'domain' => env('INBOUND_EMAIL_DOMAIN'),

    // Mailgun "HTTP webhook signing key" (Dashboard > Sending > Webhooks).
    'mailgun_signing_key' => env('MAILGUN_SIGNING_KEY'),

    // A signed request older than this is refused, which limits replay.
    'signature_max_age_seconds' => 300,

    // Sender local-parts that are never turned into tickets (bounces, robots).
    'ignored_sender_locals' => ['mailer-daemon', 'postmaster', 'no-reply', 'noreply', 'donotreply', 'do-not-reply', 'bounce', 'bounces'],
];
