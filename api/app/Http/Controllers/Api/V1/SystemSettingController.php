<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\SystemSettingResource;
use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * @group Settings
 *
 * System-wide configuration key/value pairs. Anyone authenticated can
 * read the subset marked is_public (e.g. a "support hours" display
 * string); the full set, and all writes, require settings.manage.
 */
class SystemSettingController extends Controller
{
    /**
     * List settings
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"key": "support_hours_message", "value": "Mon-Fri 9am-5pm"}]}
     */
    public function index(Request $request): JsonResponse
    {
        $query = SystemSetting::query();

        if (! $request->user()->can('settings.view')) {
            $query->where('is_public', true);
        }

        return $this->success(SystemSettingResource::collection($query->get()));
    }

    /**
     * Upsert settings
     *
     * @bodyParam settings object[] required
     * @bodyParam settings.*.key string required Example: support_hours_message
     * @bodyParam settings.*.value string required Example: Mon-Fri 9am-5pm UTC
     * @bodyParam settings.*.type string string, integer, boolean or json. Defaults to string. Example: string
     * @bodyParam settings.*.group string Defaults to general. Example: general
     * @bodyParam settings.*.is_public boolean Defaults to false. Example: true
     *
     * @response 200 {"success": true, "message": "Settings updated successfully.", "data": [{"key": "support_hours_message", "value": "Mon-Fri 9am-5pm UTC"}]}
     */
    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->can('settings.manage'), 403, 'You do not have permission to perform this action.');

        $validated = $request->validate([
            'settings' => ['required', 'array', 'min:1'],
            'settings.*.key' => ['required', 'string', 'max:255'],
            'settings.*.value' => ['nullable'],
            'settings.*.type' => ['sometimes', 'string', 'in:string,integer,boolean,json'],
            'settings.*.group' => ['sometimes', 'string', 'max:40'],
            'settings.*.is_public' => ['sometimes', 'boolean'],
        ]);

        $keys = [];

        foreach ($validated['settings'] as $setting) {
            $value = $setting['value'];
            $type = $setting['type'] ?? 'string';

            SystemSetting::updateOrCreate(
                ['key' => $setting['key']],
                [
                    'value' => $type === 'json' ? json_encode($value) : $value,
                    'type' => $type,
                    'group' => $setting['group'] ?? 'general',
                    'is_public' => $setting['is_public'] ?? false,
                ]
            );

            $keys[] = $setting['key'];
        }

        return $this->success(
            SystemSettingResource::collection(SystemSetting::whereIn('key', $keys)->get()),
            'Settings updated successfully.'
        );
    }
}
