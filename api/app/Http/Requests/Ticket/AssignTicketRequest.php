<?php

namespace App\Http\Requests\Ticket;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AssignTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('assign', $this->route('ticket'));
    }

    public function rules(): array
    {
        $tenantId = $this->user()?->tenant_id;

        return [
            // Scoped to the caller's own tenant — unscoped, a ticket
            // could be assigned to, or routed into, another tenant's
            // user/department entirely.
            'assignee_id' => ['required', 'integer', Rule::exists('users', 'id')->where('tenant_id', $tenantId)],
            'department_id' => ['sometimes', 'integer', Rule::exists('departments', 'id')->where('tenant_id', $tenantId)],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * exists:users,id only confirms the id is SOME user — it does not
     * confirm they're an active staff member who can actually work a
     * ticket. Without this, tickets.assign let a caller assign a ticket
     * to a Customer-role or deactivated account with zero guardrail
     * (AutoAssignAgentAction already filters correctly; manual assignment
     * never did).
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if (! $this->filled('assignee_id')) {
                return;
            }

            $assignee = User::find($this->input('assignee_id'));

            if (! $assignee) {
                return;
            }

            if (! $assignee->is_active) {
                $validator->errors()->add('assignee_id', 'The selected agent is not an active user.');

                return;
            }

            if ($assignee->hasRole('Customer') || ! $assignee->roles()->exists()) {
                $validator->errors()->add('assignee_id', 'The selected user is not a staff member and cannot be assigned a ticket.');
            }
        });
    }
}
