<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per (settings, period) pair. GenerateTicketNumberAction
     * locks the matching row with SELECT ... FOR UPDATE inside a
     * transaction before incrementing it, which makes number generation
     * concurrency-safe regardless of how many requests race for it.
     */
    public function up(): void
    {
        Schema::create('ticket_number_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_number_settings_id')->constrained('ticket_number_settings')->cascadeOnDelete();
            $table->string('period_key', 20); // e.g. "all", "2026", "2026-09", "2026-09-30"
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['ticket_number_settings_id', 'period_key'], 'ticket_number_sequences_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_number_sequences');
    }
};
