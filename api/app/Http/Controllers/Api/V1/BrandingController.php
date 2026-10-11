<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Support\BrandPalette;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * @group Settings
 *
 * The colour a workspace uses for its app and for the emails it sends.
 */
class BrandingController extends Controller
{
    /**
     * Get branding
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": {"primary_color": "#0f766e", "sidebar_color": null, "palette": {"primary": "#0f766e"}}}
     */
    public function show(Request $request): JsonResponse
    {
        return $this->success($this->payload($request));
    }

    /**
     * Update branding
     *
     * Send a colour as `null` to go back to its default. Only the colours you send
     * change. A primary colour white text could not be read on, or a sidebar colour
     * too light for the sidebar's text, is refused.
     *
     * @bodyParam primary_color string A hex colour for buttons, links and emails. Example: #0f766e
     * @bodyParam sidebar_color string A hex colour for the sidebar menu background. Example: #14213d
     */
    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403, 'You do not have permission to perform this action.');

        $request->validate([
            'primary_color' => ['sometimes', 'nullable', 'string', 'max:7'],
            'sidebar_color' => ['sometimes', 'nullable', 'string', 'max:7'],
        ]);

        $fields = [
            'primary_color' => [BrandPalette::SETTING_KEY, fn (string $hex) => BrandPalette::isUsable($hex), 'That colour is too light: white text on buttons would be hard to read. Choose a darker shade.'],
            'sidebar_color' => [BrandPalette::SIDEBAR_KEY, fn (string $hex) => BrandPalette::isUsableSidebar($hex), 'That colour is too light for the sidebar: its text would be hard to read. Choose a darker shade.'],
        ];

        $changes = [];
        foreach ($fields as $field => [$key, $isUsable, $tooLight]) {
            if (! $request->exists($field)) {
                continue;
            }

            $raw = $request->input($field);
            $hex = blank($raw) ? null : BrandPalette::normalize($raw);

            if (filled($raw) && $hex === null) {
                throw ValidationException::withMessages([$field => ['Enter a colour like #0f766e.']]);
            }

            if ($hex !== null && ! $isUsable($hex)) {
                throw ValidationException::withMessages([$field => [$tooLight]]);
            }

            $changes[$key] = $hex;
        }

        abort_if($changes === [], 422, 'Send primary_color or sidebar_color.');

        $tenantId = $request->user()->tenant_id;

        foreach ($changes as $key => $hex) {
            if ($hex === null) {
                SystemSetting::withoutTenantScope()->where('tenant_id', $tenantId)->where('key', $key)->get()->each->delete();

                continue;
            }

            SystemSetting::updateOrCreate(
                ['key' => $key, 'tenant_id' => $tenantId],
                ['value' => $hex, 'type' => 'string', 'group' => 'branding', 'is_public' => true],
            );
        }

        return $this->success($this->payload($request), 'Branding updated.');
    }

    private function payload(Request $request): array
    {
        $chosen = BrandPalette::chosen($request->user()->tenant);

        return [
            'primary_color' => $chosen['primary'],
            'sidebar_color' => $chosen['sidebar'],
            'palette' => BrandPalette::forTenant($request->user()->tenant),
        ];
    }
}
