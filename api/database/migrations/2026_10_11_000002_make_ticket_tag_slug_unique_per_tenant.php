<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The slug was unique across the whole table, so once tenants existed the first
 * workspace to use "vip" would block every other workspace from having that tag.
 * Uniqueness belongs per workspace.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_tags', function (Blueprint $table) {
            $table->dropUnique('ticket_tags_slug_unique');
            $table->unique(['tenant_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::table('ticket_tags', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->unique('slug');
        });
    }
};
