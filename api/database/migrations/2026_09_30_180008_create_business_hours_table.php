<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Shared business-hours schedules, referenced by both SLA policies
     * (to pause SLA clocks outside working hours) and routing rules
     * (a "business hours" condition).
     */
    public function up(): void
    {
        Schema::create('business_hours', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('timezone', 64)->default('UTC');
            // { "monday": [{"start": "09:00", "end": "17:00"}], "tuesday": [...], ... }
            $table->json('schedule');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_hours');
    }
};
