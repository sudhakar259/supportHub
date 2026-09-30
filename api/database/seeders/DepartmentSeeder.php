<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public const DEPARTMENTS = [
        ['name' => 'General Support', 'code' => 'GEN', 'description' => 'Default department for unrouted tickets.'],
        ['name' => 'Billing', 'code' => 'BILL', 'description' => 'Invoices, payments and subscription questions.'],
        ['name' => 'Technical Support', 'code' => 'TECH', 'description' => 'Product and technical troubleshooting.'],
    ];

    public function run(): void
    {
        foreach (self::DEPARTMENTS as $department) {
            Department::updateOrCreate(['code' => $department['code']], $department);
        }
    }
}
