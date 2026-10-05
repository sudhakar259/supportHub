<?php

use App\Exceptions\ApiExceptionRenderer;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;

it('returns a generic 500 without the exception message, class, file or trace', function () {
    $request = Request::create('/api/v1/tickets', 'POST');

    $response = ApiExceptionRenderer::render(new RuntimeException('secret-token at /var/www/html/app/Secret.php'), $request);

    expect($response->getStatusCode())->toBe(500);
    expect($response->getData(true))->toBe([
        'success' => false,
        'message' => 'An unexpected error occurred. Please try again later.',
    ]);
});

it('maps an oversized request body to a 413 JSON response', function () {
    $request = Request::create('/api/v1/tickets/1/attachments', 'POST');

    $response = ApiExceptionRenderer::render(new PostTooLargeException, $request);

    expect($response->getStatusCode())->toBe(413);
    expect($response->getData(true)['success'])->toBeFalse();
});
