<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Support\TenantContext;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

/**
 * Creates the first platform administrator on a fresh production install, where the demo
 * seeders (which create one with a well-known password) must not be run.
 *
 *     php artisan deskzeal:create-platform-admin you@yourcompany.com --name="Your Name"
 *
 * The password is asked for interactively and never appears in shell history or process lists.
 */
class CreatePlatformAdminCommand extends Command
{
    protected $signature = 'deskzeal:create-platform-admin {email : Sign-in email address} {--name= : Display name}';

    protected $aliases = ['supporthub:create-platform-admin'];

    protected $description = 'Create a platform administrator (asks for the password)';

    public function handle(TenantContext $tenantContext): int
    {
        $email = strtolower(trim($this->argument('email')));

        $validator = Validator::make(['email' => $email], ['email' => ['required', 'email']]);
        if ($validator->fails()) {
            $this->error($validator->errors()->first('email'));

            return self::FAILURE;
        }

        // Platform administrators have no workspace (tenant_id NULL); make sure no workspace is active.
        $tenantContext->clear();

        if (User::withoutGlobalScopes()->whereNull('tenant_id')->where('email', $email)->exists()) {
            $this->error("A platform administrator with {$email} already exists.");

            return self::FAILURE;
        }

        $password = (string) $this->secret('Password (min 10 characters, upper and lower case, a number and a symbol)');

        $rules = Validator::make(['password' => $password], ['password' => ['required', Password::min(10)->mixedCase()->numbers()->symbols()]]);
        if ($rules->fails()) {
            $this->error($rules->errors()->first('password'));

            return self::FAILURE;
        }

        if ($password !== (string) $this->secret('Repeat the password')) {
            $this->error('The passwords do not match.');

            return self::FAILURE;
        }

        $admin = User::create([
            'name' => $this->option('name') ?: 'Platform Administrator',
            'email' => $email,
            'password' => Hash::make($password),
            'is_active' => true,
        ]);
        $admin->forceFill(['email_verified_at' => now()])->save();
        $admin->syncRoles([RolesAndPermissionsSeeder::PLATFORM_ADMIN_ROLE]);

        $this->info("Platform administrator {$email} created. Turn on two-step verification after your first sign-in (Account → Security).");

        return self::SUCCESS;
    }
}
