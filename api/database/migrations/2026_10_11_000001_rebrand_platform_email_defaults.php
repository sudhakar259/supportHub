<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Update only the old platform seed values. Tenant-owned branding,
        // custom operator settings and all email/account identities stay intact.
        DB::table('system_settings')
            ->whereNull('tenant_id')
            ->where('key', 'email.sender_name')
            ->whereIn('value', ['Support24 Team', 'SupportHub Team', 'SupportHub'])
            ->update(['value' => 'DeskZeal Team']);

        DB::table('system_settings')
            ->whereNull('tenant_id')
            ->where('key', 'email.branding_signature')
            ->whereIn('value', ["Regards,\nSupport24 Team", "Regards,\nSupportHub Team", "Regards,\nSupportHub"])
            ->update(['value' => "Regards,\nDeskZeal Team"]);
    }

    public function down(): void
    {
        // Do not overwrite operator choices made after the rebrand on rollback.
    }
};
