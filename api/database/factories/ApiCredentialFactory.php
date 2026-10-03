<?php

namespace Database\Factories;

use App\Models\ApiCredential;
use Database\Factories\Concerns\DefaultsToTestTenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<ApiCredential>
 */
class ApiCredentialFactory extends Factory
{
    use DefaultsToTestTenant;

    protected $model = ApiCredential::class;

    public function definition(): array
    {
        // The plain-text secret is never recoverable from secret_hash
        // once hashed — a test that needs to actually authenticate as
        // this credential (set X-Api-Key/X-Api-Secret headers) should
        // call ApiCredential::generateCredentialPair() itself and pass
        // the pair's 'secret' through Hash::make() the same way here,
        // keeping the plain value in a local variable it can use.
        $pair = ApiCredential::generateCredentialPair();

        return [
            'tenant_id' => static::defaultTenantId(),
            'name' => fake()->unique()->words(2, true).' integration',
            'key' => $pair['key'],
            'secret_hash' => Hash::make($pair['secret']),
            'secret_last_four' => substr($pair['secret'], -4),
            'scopes' => ApiCredential::ALL_SCOPES,
            'status' => 'active',
        ];
    }
}
