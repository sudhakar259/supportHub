<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_slas', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('ticket_id')->unique()->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('sla_policy_id')->constrained('sla_policies')->restrictOnDelete();

            $table->timestamp('started_at');
            $table->timestamp('first_response_due_at');
            $table->timestamp('resolution_due_at');

            $table->timestamp('first_response_met_at')->nullable();
            $table->timestamp('resolved_met_at')->nullable();

            $table->boolean('first_response_breached')->default(false);
            $table->boolean('resolution_breached')->default(false);
            $table->string('status', 20)->default('pending'); // pending, met, breached, paused

            $table->timestamps();

            $table->index(['status', 'resolution_due_at']);
            $table->index(['status', 'first_response_due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_slas');
    }
};
