<?php

namespace App\Policies;

use App\Models\ApiCredential;
use App\Models\User;

class ApiCredentialPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('api-credentials.view');
    }

    public function view(User $user, ApiCredential $credential): bool
    {
        return $user->can('api-credentials.view');
    }

    public function update(User $user, ApiCredential $credential): bool
    {
        return $user->can('api-credentials.update');
    }

    public function delete(User $user, ApiCredential $credential): bool
    {
        return $user->can('api-credentials.revoke');
    }
}
