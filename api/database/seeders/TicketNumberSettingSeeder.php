<?php

namespace Database\Seeders;

use App\Models\TicketNumberSetting;
use Illuminate\Database\Seeder;

class TicketNumberSettingSeeder extends Seeder
{
    public function run(): void
    {
        if (TicketNumberSetting::where('department_id', null)->where('is_active', true)->exists()) {
            return;
        }

        TicketNumberSetting::create([
            'department_id' => null,
            'prefix' => 'TKT',
            'format' => '{prefix}-{year}-{number}',
            'starting_number' => 1,
            'number_length' => 6,
            'reset_period' => 'yearly',
            'is_active' => true,
            'effective_from' => now(),
        ]);
    }
}
