<?php

namespace App\Http\Requests\Platform;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        // RequirePlatformAdmin already gates every /platform/* route —
        // no finer-grained permission exists for this small admin
        // surface (see RolesAndPermissionsSeeder::PLATFORM_ADMIN_ROLE).
        return true;
    }

    public function rules(): array
    {
        return [
            // Deliberately excludes slug and status: slug is how every
            // tenant-scoped login/register call already addresses this
            // tenant (changing it breaks existing integrations without
            // warning), and status only ever changes through the
            // suspend/activate actions, which log why.
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'nullable', 'string', 'email', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'website' => ['sometimes', 'nullable', 'string', 'max:255'],
            'country' => ['sometimes', 'nullable', 'string', 'max:2'],
            'timezone' => ['sometimes', 'string', 'max:64'],
        ];
    }
}
