<?php

namespace App\Support;

use App\Models\SystemSetting;
use App\Models\Tenant;

/**
 * Turns the one colour a workspace chooses into the handful of related shades
 * the app and its emails need. It is computed here, once, so the web app and
 * the mail theme can never disagree, and a choice that would make text
 * unreadable is refused instead of saved.
 */
final class BrandPalette
{
    public const SETTING_KEY = 'branding.primary_color';

    public const SIDEBAR_KEY = 'branding.sidebar_color';

    public const DEFAULT_PRIMARY = '#a33900';

    public const DEFAULT_SIDEBAR = '#213145';

    /** White text sits on the primary colour (buttons, active items). */
    private const MIN_CONTRAST = 4.5;

    /** The palest text the sidebar shows (section headings): it has to stay readable on the sidebar colour. */
    private const SIDEBAR_TEXT = '#bec5e5';

    public static function normalize(?string $value): ?string
    {
        $value = strtolower(trim((string) $value));

        if (preg_match('/^#?([0-9a-f]{6})$/', $value, $m) === 1) {
            return '#'.$m[1];
        }

        if (preg_match('/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/', $value, $m) === 1) {
            return '#'.$m[1].$m[1].$m[2].$m[2].$m[3].$m[3];
        }

        return null;
    }

    /** Whether white text on this colour is comfortably readable. */
    public static function isUsable(string $hex): bool
    {
        return self::contrast($hex, '#ffffff') >= self::MIN_CONTRAST;
    }

    /** Whether the sidebar's light text can be read on this colour. */
    public static function isUsableSidebar(string $hex): bool
    {
        return self::contrast($hex, self::SIDEBAR_TEXT) >= self::MIN_CONTRAST;
    }

    /**
     * @return array{primary: string, on_primary: string, primary_container: string, on_primary_container: string, inverse_primary: string, primary_fixed: string, primary_fixed_dim: string, on_primary_fixed: string, on_primary_fixed_variant: string, surface_tint: string, sidebar: string}
     */
    public static function forPrimary(string $primary, string $sidebar = self::DEFAULT_SIDEBAR): array
    {
        $container = self::mix($primary, '#ffffff', 0.12);
        if (self::contrast($container, '#ffffff') < self::MIN_CONTRAST) {
            $container = $primary;
        }

        $accent = self::lightenUntil($primary, $sidebar);
        $fixed = self::mix($primary, '#ffffff', 0.85);

        $onFixedVariant = $primary;
        for ($t = 0.0; $t <= 1.0 && self::contrast($onFixedVariant, $fixed) < self::MIN_CONTRAST; $t += 0.1) {
            $onFixedVariant = self::mix($primary, '#000000', $t);
        }

        return [
            'primary' => $primary,
            'on_primary' => '#ffffff',
            'primary_container' => $container,
            'on_primary_container' => '#ffffff',
            'inverse_primary' => $accent,
            'primary_fixed' => $fixed,
            'primary_fixed_dim' => $accent,
            'on_primary_fixed' => self::mix($primary, '#000000', 0.8),
            'on_primary_fixed_variant' => $onFixedVariant,
            'surface_tint' => $primary,
            'sidebar' => $sidebar,
        ];
    }

    /**
     * The colours a workspace has chosen, each null when not set (or no longer usable).
     *
     * @return array{primary: ?string, sidebar: ?string}
     */
    public static function chosen(?Tenant $tenant): array
    {
        if ($tenant === null) {
            return ['primary' => null, 'sidebar' => null];
        }

        $values = SystemSetting::withoutTenantScope()
            ->where('tenant_id', $tenant->id)
            ->whereIn('key', [self::SETTING_KEY, self::SIDEBAR_KEY])
            ->pluck('value', 'key');

        $primary = self::normalize($values[self::SETTING_KEY] ?? null);
        $sidebar = self::normalize($values[self::SIDEBAR_KEY] ?? null);

        return [
            'primary' => $primary !== null && self::isUsable($primary) ? $primary : null,
            'sidebar' => $sidebar !== null && self::isUsableSidebar($sidebar) ? $sidebar : null,
        ];
    }

    /** The workspace's palette, or null when it has chosen nothing (the default theme applies). */
    public static function forTenant(?Tenant $tenant): ?array
    {
        $chosen = self::chosen($tenant);

        if ($chosen['primary'] === null && $chosen['sidebar'] === null) {
            return null;
        }

        return self::forPrimary($chosen['primary'] ?? self::DEFAULT_PRIMARY, $chosen['sidebar'] ?? self::DEFAULT_SIDEBAR);
    }

    /** Lightens the colour just far enough to be read on the given dark background. */
    private static function lightenUntil(string $hex, string $background): string
    {
        $shade = $hex;
        for ($t = 0.5; $t <= 1.0; $t += 0.05) {
            $shade = self::mix($hex, '#ffffff', $t);
            if (self::contrast($shade, $background) >= self::MIN_CONTRAST) {
                break;
            }
        }

        return $shade;
    }

    public static function contrast(string $a, string $b): float
    {
        $la = self::luminance($a);
        $lb = self::luminance($b);

        return (max($la, $lb) + 0.05) / (min($la, $lb) + 0.05);
    }

    private static function luminance(string $hex): float
    {
        [$r, $g, $b] = array_map(function (int $channel): float {
            $c = $channel / 255;

            return $c <= 0.03928 ? $c / 12.92 : (($c + 0.055) / 1.055) ** 2.4;
        }, self::rgb($hex));

        return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
    }

    /** @return array{int, int, int} */
    private static function rgb(string $hex): array
    {
        $hex = ltrim($hex, '#');

        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    /** $amount of $other mixed into $hex, 0 = unchanged, 1 = fully $other. */
    private static function mix(string $hex, string $other, float $amount): string
    {
        $from = self::rgb($hex);
        $to = self::rgb($other);

        return sprintf('#%02x%02x%02x', ...array_map(
            fn (int $i): int => (int) round($from[$i] + ($to[$i] - $from[$i]) * $amount),
            [0, 1, 2],
        ));
    }
}
