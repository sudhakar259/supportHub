<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by DeliverWebhookJob on any non-2xx response or transport
 * error, purely to trigger Laravel's own queue retry/backoff — never
 * rendered to an API response (this is always thrown from inside a
 * queued job, not a request).
 */
class WebhookDeliveryFailedException extends RuntimeException {}
