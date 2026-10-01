<?php

namespace Database\Seeders;

use App\Models\MembershipPlan;
use Illuminate\Database\Seeder;

class MembershipPlanSeeder extends Seeder
{
    public const PLANS = [
        [
            'name' => 'Starter', 'slug' => 'starter', 'price_cents' => 0,
            'description' => 'For small teams getting started.',
            'limits' => ['users' => 3, 'customers' => 100, 'tickets_per_month' => 200, 'departments' => 1, 'api_requests_per_day' => 500, 'webhooks' => 1],
        ],
        [
            'name' => 'Professional', 'slug' => 'professional', 'price_cents' => 4900,
            'description' => 'For growing support teams.',
            'limits' => ['users' => 15, 'customers' => 2000, 'tickets_per_month' => 2000, 'departments' => 5, 'api_requests_per_day' => 5000, 'webhooks' => 5],
        ],
        [
            'name' => 'Business', 'slug' => 'business', 'price_cents' => 14900,
            'description' => 'For established support operations.',
            'limits' => ['users' => 50, 'customers' => 10000, 'tickets_per_month' => 10000, 'departments' => 20, 'api_requests_per_day' => 25000, 'webhooks' => 20],
        ],
        [
            'name' => 'Enterprise', 'slug' => 'enterprise', 'price_cents' => 0,
            'description' => 'Custom pricing — contact sales. No usage limits.',
            // null = unlimited, see MembershipPlan::limit()
            'limits' => ['users' => null, 'customers' => null, 'tickets_per_month' => null, 'departments' => null, 'api_requests_per_day' => null, 'webhooks' => null],
        ],
    ];

    public function run(): void
    {
        foreach (self::PLANS as $index => $plan) {
            MembershipPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan + ['currency' => 'USD', 'billing_interval' => 'monthly', 'is_active' => true, 'sort_order' => $index]
            );
        }
    }
}
