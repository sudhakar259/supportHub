<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * @group Developer Documentation
 *
 * Documentation and reference exports require an authenticated tenant session.
 */
class DeveloperDocumentationController extends Controller
{
    private const HEADERS = [
        'Cache-Control' => 'private, no-store, max-age=0',
        'Pragma' => 'no-cache',
        'X-Robots-Tag' => 'noindex, nofollow',
    ];

    /**
     * Read developer documentation
     *
     * Returns the integration guide and generated endpoint reference for the workspace viewer.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"guide": "# Integration guide", "reference": [], "baseUrl": "https://api.example.com"}}
     * @response 401 {"success": false, "message": "Unauthenticated."}
     */
    public function index(): JsonResponse
    {
        $guide = $this->documentPath('integration-guide.md');
        $collection = $this->documentPath('reference/collection.json');

        return $this->success([
            'guide' => file_get_contents($guide),
            'reference' => json_decode(file_get_contents($collection), true, flags: JSON_THROW_ON_ERROR)['item'],
            'baseUrl' => rtrim(config('app.url'), '/'),
        ])->withHeaders(self::HEADERS);
    }

    /**
     * Download an API reference export
     *
     * @urlParam format string required The export format: openapi or postman. Example: postman
     *
     * @response 200 scenario="Postman file download" {"info": {"name": "API reference"}, "item": []}
     * @response 401 {"success": false, "message": "Unauthenticated."}
     */
    public function download(string $format): BinaryFileResponse
    {
        [$file, $type] = match ($format) {
            'openapi' => ['openapi.yaml', 'application/yaml'],
            'postman' => ['collection.json', 'application/json'],
            default => abort(404),
        };

        $response = response()->download($this->documentPath('reference/'.$file), $file, [
            ...self::HEADERS,
            'Content-Type' => $type,
        ]);

        // BinaryFileResponse defaults downloads to public after constructing its headers.
        $response->setPrivate();

        return $response;
    }

    private function documentPath(string $file): string
    {
        $path = resource_path('developer-docs/'.$file);
        abort_unless(is_file($path), 503, 'Developer documentation is temporarily unavailable.');

        return $path;
    }
}
