<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationPreferenceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * @group Notifications
 *
 * Every user manages their own notification preferences — there is no
 * admin override of another user's preferences, since they describe a
 * personal inbox choice, not a permission.
 */
class NotificationPreferenceController extends Controller
{
    /**
     * List my notification preferences
     *
     * Any event key without an explicit preference row is enabled by
     * default (opt-out model) and simply won't appear here until set.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "channel": "mail", "event_key": "ticket_created", "enabled": true}]}
     */
    public function index(Request $request): JsonResponse
    {
        return $this->success(NotificationPreferenceResource::collection(
            $request->user()->notificationPreferences
        ));
    }

    /**
     * Update my notification preferences
     *
     * Upserts one or more (channel, event_key) preferences for the
     * authenticated user.
     *
     * @bodyParam preferences object[] required
     * @bodyParam preferences.*.channel string required mail or database. Example: mail
     * @bodyParam preferences.*.event_key string required One of the notification template keys. Example: ticket_created
     * @bodyParam preferences.*.enabled boolean required Example: false
     *
     * @response 200 {"success": true, "message": "Preferences updated successfully.", "data": [{"channel": "mail", "event_key": "ticket_created", "enabled": false}]}
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array', 'min:1'],
            'preferences.*.channel' => ['required', 'string', 'in:mail,database'],
            'preferences.*.event_key' => ['required', 'string', Rule::exists('notification_templates', 'key')],
            'preferences.*.enabled' => ['required', 'boolean'],
        ]);

        $user = $request->user();

        foreach ($validated['preferences'] as $preference) {
            $user->notificationPreferences()->updateOrCreate(
                ['channel' => $preference['channel'], 'event_key' => $preference['event_key']],
                ['enabled' => $preference['enabled']]
            );
        }

        return $this->success(
            NotificationPreferenceResource::collection($user->notificationPreferences()->get()),
            'Preferences updated successfully.'
        );
    }
}
