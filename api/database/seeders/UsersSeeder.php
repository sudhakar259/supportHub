<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['email' => 'admin@deskzeal.test'],
            [
                'name' => 'System Administrator',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'is_active' => true,
            ]
        );
        $admin->syncRoles(['Administrator']);

        $billing = Department::where('code', 'BILL')->first();
        $tech = Department::where('code', 'TECH')->first();
        $general = Department::where('code', 'GEN')->first();

        $manager = User::updateOrCreate(
            ['email' => 'manager@deskzeal.test'],
            ['name' => 'Morgan Manager', 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
        );
        $manager->syncRoles(['Department Manager']);
        if ($tech) {
            $tech->update(['manager_id' => $manager->id]);
            $manager->departments()->syncWithoutDetaching([$tech->id => ['is_primary' => true]]);
        }

        $seniorAgent = User::updateOrCreate(
            ['email' => 'senior.agent@deskzeal.test'],
            ['name' => 'Sam Senior', 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
        );
        $seniorAgent->syncRoles(['Senior Agent']);
        if ($tech) {
            $seniorAgent->departments()->syncWithoutDetaching([$tech->id => ['is_primary' => true]]);
        }

        $agents = [
            ['name' => 'Alex Agent', 'email' => 'agent1@deskzeal.test', 'department' => $tech],
            ['name' => 'Jamie Agent', 'email' => 'agent2@deskzeal.test', 'department' => $billing],
            ['name' => 'Riley Agent', 'email' => 'agent3@deskzeal.test', 'department' => $general],
        ];

        foreach ($agents as $data) {
            $agent = User::updateOrCreate(
                ['email' => $data['email']],
                ['name' => $data['name'], 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
            );
            $agent->syncRoles(['Agent']);

            if ($data['department']) {
                $agent->departments()->syncWithoutDetaching([$data['department']->id => ['is_primary' => true]]);
            }
        }

        $customers = [
            ['name' => 'Casey Customer', 'email' => 'customer1@deskzeal.test', 'company_name' => 'Help Corp', 'customer_type' => 'business'],
            ['name' => 'Drew Client', 'email' => 'customer2@deskzeal.test', 'company_name' => null, 'customer_type' => 'individual'],
            ['name' => 'Taylor VIP', 'email' => 'customer3@deskzeal.test', 'company_name' => 'Globex Inc', 'customer_type' => 'vip'],
        ];

        foreach ($customers as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                ['name' => $data['name'], 'password' => Hash::make('password'), 'email_verified_at' => now(), 'is_active' => true]
            );
            $user->syncRoles(['Customer']);

            Customer::updateOrCreate(
                ['user_id' => $user->id],
                ['company_name' => $data['company_name'], 'customer_type' => $data['customer_type']]
            );
        }
    }
}
