<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            // A tenant's own identifier for this customer in their
            // external system (CRM id, account number, etc.) — how the
            // Integration API looks customers up without exposing our
            // internal numeric id. Unique per tenant, not globally:
            // two different tenants' external systems can reuse the
            // same id scheme without colliding (MySQL/SQLite unique
            // indexes treat NULLs as distinct, so customers without one
            // never collide with each other either).
            $table->string('external_id')->nullable()->after('user_id');
            $table->unique(['tenant_id', 'external_id']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'external_id']);
            $table->dropColumn('external_id');
        });
    }
};
