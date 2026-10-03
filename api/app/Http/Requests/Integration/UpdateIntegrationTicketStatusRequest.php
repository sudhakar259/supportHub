<?php

namespace App\Http\Requests\Integration;

use App\Services\TicketStatusWorkflow;
use Illuminate\Foundation\Http\FormRequest;

class UpdateIntegrationTicketStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Whether this specific transition is actually legal from
            // the ticket's current status is TicketStatusWorkflow's
            // call, not a validation rule — this just rejects a typo'd
            // slug early with a clean 422 instead of a confusing
            // "no such status" 404 deeper in the action.
            'status' => ['required', 'string', 'in:'.implode(',', array_keys(TicketStatusWorkflow::TRANSITIONS))],
            'reason' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
