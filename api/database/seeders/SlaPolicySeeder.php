<?php

namespace Database\Seeders;

use App\Models\BusinessHours;
use App\Models\SlaPolicy;
use App\Models\TicketPriority;
use Illuminate\Database\Seeder;

class SlaPolicySeeder extends Seeder
{
    public const POLICIES = [
        'low' => ['first_response_minutes' => 480, 'resolution_minutes' => 2880],   // 8h / 48h
        'medium' => ['first_response_minutes' => 240, 'resolution_minutes' => 1440], // 4h / 24h
        'high' => ['first_response_minutes' => 120, 'resolution_minutes' => 480],    // 2h / 8h
        'urgent' => ['first_response_minutes' => 30, 'resolution_minutes' => 240],   // 30m / 4h
    ];

    public function run(): void
    {
        $businessHours = BusinessHours::where('is_default', true)->first();

        foreach (self::POLICIES as $slug => $times) {
            $priority = TicketPriority::where('slug', $slug)->first();

            if (! $priority) {
                continue;
            }

            SlaPolicy::updateOrCreate(
                ['priority_id' => $priority->id, 'department_id' => null],
                [
                    'name' => ucfirst($slug).' Priority SLA',
                    'description' => "Default SLA for {$slug} priority tickets.",
                    'business_hours_id' => $businessHours?->id,
                    'first_response_minutes' => $times['first_response_minutes'],
                    'resolution_minutes' => $times['resolution_minutes'],
                    'business_hours_only' => false,
                    'is_default' => true,
                    'is_active' => true,
                ]
            );
        }
    }
}
