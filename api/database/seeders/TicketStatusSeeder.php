<?php

namespace Database\Seeders;

use App\Models\TicketStatus;
use Illuminate\Database\Seeder;

class TicketStatusSeeder extends Seeder
{
    public const STATUSES = [
        ['name' => 'Open', 'slug' => 'open', 'color' => '#3B82F6', 'is_default' => true, 'is_closed' => false, 'sort_order' => 1],
        ['name' => 'In Progress', 'slug' => 'in-progress', 'color' => '#F59E0B', 'is_default' => false, 'is_closed' => false, 'sort_order' => 2],
        ['name' => 'Pending', 'slug' => 'pending', 'color' => '#8B5CF6', 'is_default' => false, 'is_closed' => false, 'sort_order' => 3],
        ['name' => 'Escalated', 'slug' => 'escalated', 'color' => '#EF4444', 'is_default' => false, 'is_closed' => false, 'sort_order' => 4],
        ['name' => 'Resolved', 'slug' => 'resolved', 'color' => '#10B981', 'is_default' => false, 'is_closed' => false, 'sort_order' => 5],
        ['name' => 'Closed', 'slug' => 'closed', 'color' => '#6B7280', 'is_default' => false, 'is_closed' => true, 'sort_order' => 6],
        ['name' => 'Reopened', 'slug' => 'reopened', 'color' => '#EC4899', 'is_default' => false, 'is_closed' => false, 'sort_order' => 7],
    ];

    public function run(): void
    {
        foreach (self::STATUSES as $status) {
            TicketStatus::updateOrCreate(['slug' => $status['slug']], $status);
        }
    }
}
