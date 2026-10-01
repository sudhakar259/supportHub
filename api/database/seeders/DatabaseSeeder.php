<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolesAndPermissionsSeeder::class,
            TicketStatusSeeder::class,
            TicketPrioritySeeder::class,
            DepartmentSeeder::class,
            TicketCategorySeeder::class,
            BusinessHoursSeeder::class,
            SlaPolicySeeder::class,
            TicketNumberSettingSeeder::class,
            NotificationTemplateSeeder::class,
            UsersSeeder::class,
            DemoTicketSeeder::class,
        ]);
    }
}
