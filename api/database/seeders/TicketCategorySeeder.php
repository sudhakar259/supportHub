<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\TicketCategory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TicketCategorySeeder extends Seeder
{
    public const CATEGORIES = [
        'BILL' => [
            'Billing' => ['Invoice Question', 'Refund Request', 'Subscription Change'],
        ],
        'TECH' => [
            'Technical Issue' => ['Login Problem', 'Bug Report', 'Integration Issue'],
        ],
        'GEN' => [
            'General Inquiry' => ['Feature Request', 'Other'],
        ],
    ];

    public function run(): void
    {
        foreach (self::CATEGORIES as $departmentCode => $categories) {
            $department = Department::where('code', $departmentCode)->first();

            foreach ($categories as $name => $children) {
                $parent = TicketCategory::updateOrCreate(
                    ['slug' => Str::slug($name), 'parent_id' => null],
                    ['name' => $name, 'department_id' => $department?->id, 'is_active' => true]
                );

                foreach ($children as $sortOrder => $childName) {
                    TicketCategory::updateOrCreate(
                        ['slug' => Str::slug($name.'-'.$childName), 'parent_id' => $parent->id],
                        [
                            'name' => $childName,
                            'department_id' => $department?->id,
                            'is_active' => true,
                            'sort_order' => $sortOrder,
                        ]
                    );
                }
            }
        }
    }
}
