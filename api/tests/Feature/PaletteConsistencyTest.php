<?php

/**
 * The email theme, the API reference and the web stylesheet each restate the palette. These tests
 * fail when one drifts from design/solar_navy_enterprise/DESIGN.md (docs/color-palette.md).
 */

// These compare files from all three parts of the repository. When only api/ is available (for example
// a container that mounts just that folder) there is nothing to compare, so they skip rather than fail.
uses()->beforeEach(function () {
    if (! is_file(base_path('../design/solar_navy_enterprise/DESIGN.md')) || ! is_file(base_path('../web/src/index.css'))) {
        $this->markTestSkipped('Needs the whole repository checkout (design/ and web/ next to api/).');
    }
});

/** @return array<string, string> role => #hex, read from the YAML block of the design file. */
function designPalette(): array
{
    $design = file_get_contents(base_path('../design/solar_navy_enterprise/DESIGN.md'));
    $yaml = explode('typography:', $design, 2)[0];
    preg_match_all("/^\s{2}([a-z0-9-]+): '(#[0-9a-fA-F]{6})'/m", $yaml, $m);

    return array_combine($m[1], array_map('strtolower', $m[2]));
}

/** @return array<string, string> role => #hex, read from the web app's @theme tokens. */
function webTokens(): array
{
    $css = file_get_contents(base_path('../web/src/index.css'));
    preg_match_all('/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6});/', $css, $m);

    return array_combine($m[1], array_map('strtolower', $m[2]));
}

it('keeps the web stylesheet identical to the design file for every role', function () {
    $design = designPalette();
    $web = webTokens();

    expect($design)->not->toBeEmpty()->and(count($design))->toBeGreaterThan(50);

    foreach ($design as $role => $hex) {
        expect($web[$role] ?? null)->toBe($hex, "web/src/index.css --color-{$role} differs from DESIGN.md");
    }
});

it('builds the email theme only from palette colors', function () {
    $palette = array_values(designPalette());
    $css = strtolower(file_get_contents(resource_path('views/vendor/mail/html/themes/supporthub.css')));
    preg_match_all('/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/', $css, $m);

    $offPalette = array_values(array_filter(array_unique($m[0]), function (string $hex) use ($palette) {
        $full = strlen($hex) === 4 ? '#'.$hex[1].$hex[1].$hex[2].$hex[2].$hex[3].$hex[3] : $hex;

        return ! in_array($full, $palette, true);
    }));

    expect($offPalette)->toBe([]); // anything listed here is a color the email theme uses that is not in DESIGN.md
});

it('builds the API reference theme only from palette colors, and loads no outside font', function () {
    $palette = array_values(designPalette());
    $partial = strtolower(file_get_contents(resource_path('views/vendor/scribe/themes/default/palette.blade.php')));
    preg_match_all('/#[0-9a-f]{6}\b/', $partial, $m);

    $offPalette = array_values(array_filter(array_unique($m[0]), fn (string $hex) => ! in_array($hex, $palette, true)));
    expect($offPalette)->toBe([]); // anything listed here is a color the API reference uses that is not in DESIGN.md

    $generated = file_get_contents(public_path('docs/index.html'));
    expect($generated)->toContain('--primary: #a33900')->not->toContain('fonts.googleapis.com');
});

it('uses the primary browser theme color and the supplied favicon artwork', function () {
    expect(file_get_contents(base_path('../web/index.html')))->toContain('name="theme-color" content="#a33900"')
        ->toContain('type="image/png" href="/favicon.png"')
        ->and(file_get_contents(base_path('../web/public/favicon.png')))->toBe(file_get_contents(public_path('favicon.png')));
    if (is_file(base_path('../design/logo/favicon.png'))) {
        expect(file_get_contents(public_path('favicon.png')))->toBe(file_get_contents(base_path('../design/logo/favicon.png')));
    }
});
