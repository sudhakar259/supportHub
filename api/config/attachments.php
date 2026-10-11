<?php

/**
 * Ticket attachment limits — the single source of truth for every upload
 * path (staff and customer ticket endpoints, message attachments, the
 * integration API). See App\Support\AttachmentRules.
 */
return [
    // Per file, in kilobytes (as Laravel's `max` rule counts them).
    'max_kb' => (int) env('ATTACHMENT_MAX_KB', 2048),

    // Allowed filename extensions (also enforced against the sniffed content type).
    'extensions' => ['jpg', 'jpeg', 'png', 'webp', 'txt', 'pdf', 'docx', 'ppt', 'pptx'],

    // Per message.
    'max_per_message' => 5,
];
