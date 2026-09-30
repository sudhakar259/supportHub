<?php

namespace Database\Seeders;

use App\Models\TicketPriority;
use Illuminate\Database\Seeder;

class TicketPrioritySeeder extends Seeder
{
    public const PRIORITIES = [
        ['name' => 'Low', 'slug' => 'low', 'level' => 1, 'color' => '#10B981', 'is_default' => false],
        ['name' => 'Medium', 'slug' => 'medium', 'level' => 2, 'color' => '#3B82F6', 'is_default' => true],
        ['name' => 'High', 'slug' => 'high', 'level' => 3, 'color' => '#F59E0B', 'is_default' => false],
        ['name' => 'Urgent', 'slug' => 'urgent', 'level' => 4, 'color' => '#EF4444', 'is_default' => false],
    ];

    public function run(): void
    {
        foreach (self::PRIORITIES as $priority) {
            TicketPriority::updateOrCreate(['slug' => $priority['slug']], $priority);
        }
    }
}
