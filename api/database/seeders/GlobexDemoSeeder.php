<?php

namespace Database\Seeders;

use App\Actions\Ticket\CreateTicketAction;
use App\Models\Customer;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * A second, smaller tenant with its own admin/agent/customer/ticket —
 * deliberately minimal, existing mainly so tenant isolation has a real
 * second tenant to test against out of the box (see
 * tests/Feature/TenantIsolationTest.php).
 */
class GlobexDemoSeeder extends Seeder
{
    public function run(): void
    {
        $department = Department::create([
            'name' => 'General Support',
            'code' => 'GEN',
            'is_active' => true,
        ]);

        $admin = User::updateOrCreate(
            ['email' => 'admin@globex-helpdesk.test'],
            ['name' => 'Globex Administrator', 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
        );
        $admin->syncRoles(['Administrator']);

        $agent = User::updateOrCreate(
            ['email' => 'agent@globex-helpdesk.test'],
            ['name' => 'Globex Agent', 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
        );
        $agent->syncRoles(['Agent']);
        $agent->departments()->syncWithoutDetaching([$department->id => ['is_primary' => true]]);

        $customerUser = User::updateOrCreate(
            ['email' => 'customer@globex-helpdesk.test'],
            ['name' => 'Globex Customer', 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
        );
        $customerUser->syncRoles(['Customer']);

        $customer = Customer::updateOrCreate(
            ['user_id' => $customerUser->id],
            ['customer_type' => 'business', 'company_name' => 'Globex Corporation']
        );

        app(CreateTicketAction::class)->execute($customer, [
            'subject' => 'Welcome to Globex Helpdesk',
            'description' => 'This ticket exists purely to demonstrate that Acme Support cannot see it.',
        ]);
    }
}
