<?php

use App\Models\Department;
use App\Models\MembershipPlan;
use App\Models\Subscription;
use Database\Seeders\MembershipPlanSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;

beforeEach(function () {
    $this->seed(RolesAndPermissionsSeeder::class);
    testTenant();
    $this->seed(MembershipPlanSeeder::class);
});

it('reports a duplicate department code as a validation error even when the plan cap is reached', function () {
    $tenant = testTenant();
    $starter = MembershipPlan::where('slug', 'starter')->firstOrFail();
    $starter->update(['limits' => array_merge($starter->limits ?? [], ['departments' => 1])]);
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $starter->id, 'status' => 'active']);

    Department::factory()->create(['code' => 'DUP']);
    $admin = actingAsAdministrator($tenant);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', ['name' => 'Duplicate', 'code' => 'DUP'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['code']);
});

it('blocks a new department once the plan cap is reached', function () {
    $tenant = testTenant();
    $starter = MembershipPlan::where('slug', 'starter')->firstOrFail();
    $starter->update(['limits' => array_merge($starter->limits ?? [], ['departments' => 1])]);
    Subscription::create(['tenant_id' => $tenant->id, 'membership_plan_id' => $starter->id, 'status' => 'active']);

    Department::factory()->create(['code' => 'ONE']);
    $admin = actingAsAdministrator($tenant);

    $this->actingAs($admin, 'api')
        ->postJson('/api/v1/departments', ['name' => 'Second', 'code' => 'TWO'])
        ->assertStatus(403)
        ->assertJsonPath('errors.feature', 'departments');
});
