<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only assignment history: every assignment/reassignment inserts
     * a new row rather than mutating a previous one, so the full history is
     * always reconstructable. `unassigned_at` is stamped on the previous
     * "current" row when it is superseded.
     */
    public function up(): void
    {
        Schema::create('ticket_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('previous_assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();

            // automatic, manual, reassignment, round_robin, workload_based
            $table->string('assignment_type', 30);
            $table->text('note')->nullable();

            $table->timestamp('assigned_at')->useCurrent();
            $table->timestamp('unassigned_at')->nullable();

            $table->timestamps();

            $table->index(['ticket_id', 'assigned_at']);
            $table->index(['assignee_id', 'unassigned_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_assignments');
    }
};
