<?php

namespace Database\Seeders;

use App\Models\BusinessHours;
use Illuminate\Database\Seeder;

class BusinessHoursSeeder extends Seeder
{
    public function run(): void
    {
        $weekday = [['start' => '09:00', 'end' => '17:00']];

        BusinessHours::updateOrCreate(
            ['name' => 'Standard Business Hours'],
            [
                'timezone' => 'UTC',
                'is_default' => true,
                'schedule' => [
                    'monday' => $weekday,
                    'tuesday' => $weekday,
                    'wednesday' => $weekday,
                    'thursday' => $weekday,
                    'friday' => $weekday,
                    'saturday' => [],
                    'sunday' => [],
                ],
            ]
        );
    }
}
