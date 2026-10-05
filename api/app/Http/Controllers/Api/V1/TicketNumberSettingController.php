<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TicketNumberSetting\StoreTicketNumberSettingRequest;
use App\Http\Resources\TicketNumberSettingResource;
use App\Models\TicketNumberSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * @group Settings
 *
 * Ticket-number generation rules (see GenerateTicketNumberAction). A new
 * row is inserted whenever the active configuration changes rather than
 * mutating one in place, so tickets already created keep the number they
 * were generated under — see the table's own migration comment.
 */
class TicketNumberSettingController extends Controller
{
    /**
     * List ticket number settings
     *
     * Returns every row for this tenant (current and historical),
     * most recently effective first.
     *
     * @response 200 {"success": true, "message": "Request successful.", "data": [{"id": 1, "department_id": null, "prefix": "TKT", "is_active": true}]}
     */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('settings.view')) {
            return $this->error('You do not have permission to perform this action.', 403);
        }

        return $this->success(TicketNumberSettingResource::collection(
            TicketNumberSetting::query()->orderByDesc('effective_from')->get()
        ));
    }

    /**
     * Create a ticket number setting
     *
     * Deactivates any existing active row for the same scope
     * (`department_id`, or the tenant's global default when omitted)
     * and inserts this as the new active one — the previous row is kept
     * for history, not deleted.
     *
     * @bodyParam department_id integer Omit for the tenant-wide default. Example: null
     * @bodyParam prefix string required Example: ACME
     * @bodyParam format string required Tokens: {prefix} {number} {year} {month} {day} {department} {department_code}. Example: {prefix}-{year}-{number}
     * @bodyParam starting_number integer required Example: 1
     * @bodyParam number_length integer required Zero-padded width of {number}. Example: 6
     * @bodyParam reset_period string required One of never, yearly, monthly, daily. Example: yearly
     * @bodyParam is_active boolean Defaults to true. Example: true
     *
     * @response 201 {"success": true, "message": "Ticket number setting created successfully.", "data": {"id": 2, "prefix": "ACME", "is_active": true}}
     */
    public function store(StoreTicketNumberSettingRequest $request): JsonResponse
    {
        $setting = DB::transaction(function () use ($request) {
            $isActive = $request->boolean('is_active', true);

            if ($isActive) {
                TicketNumberSetting::query()
                    ->where('department_id', $request->input('department_id'))
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }

            // fresh(): effective_from is DB-computed (useCurrent()), which
            // the in-memory instance from create() doesn't reflect without
            // re-fetching — the response would otherwise show it as null.
            return TicketNumberSetting::create([
                'department_id' => $request->input('department_id'),
                'prefix' => $request->string('prefix'),
                'format' => $request->string('format'),
                'starting_number' => $request->integer('starting_number'),
                'number_length' => $request->integer('number_length'),
                'reset_period' => $request->string('reset_period'),
                'is_active' => $isActive,
            ])->fresh();
        });

        return $this->created(new TicketNumberSettingResource($setting), 'Ticket number setting created successfully.');
    }
}
