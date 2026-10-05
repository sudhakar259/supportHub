<?php

use App\Models\SystemSetting;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Cache;

it('caches setting values as plain data so reads survive a database cache round-trip', function () {
    $tenant = testTenant();

    app(TenantContext::class)->runAs($tenant, function () use ($tenant) {
        SystemSetting::create([
            'tenant_id' => $tenant->id,
            'key' => 'email.reply_to',
            'value' => 'support@example.test',
            'type' => 'string',
            'group' => 'email',
        ]);

        $cacheKey = 'system_settings.v2.all.'.$tenant->id;
        Cache::forget($cacheKey);

        expect(SystemSetting::get('email.reply_to'))->toBe('support@example.test');

        $cached = Cache::get($cacheKey);
        expect($cached)->toBeArray();
        expect(serialize($cached))->not->toContain('SystemSetting');
        expect(SystemSetting::get('email.missing', 'fallback'))->toBe('fallback');
    });
});
