<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tickets use a ULID primary key (not the public ticket_number) because
     * the id is what appears in API URLs (/api/v1/tickets/{ticket}); a ULID
     * keeps that value non-sequential so ticket existence/volume can't be
     * enumerated by walking integers, while ticket_number stays a separate,
     * human-facing, configurable identifier (TKT-2026-000125).
     */
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->string('ticket_number')->unique();

            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->string('subject');
            $table->text('description');

            $table->foreignId('category_id')->nullable()->constrained('ticket_categories')->nullOnDelete();
            $table->foreignId('priority_id')->constrained('ticket_priorities')->restrictOnDelete();
            $table->foreignId('status_id')->constrained('ticket_statuses')->restrictOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();

            $table->unsignedInteger('reopened_count')->default(0);

            $table->timestamp('first_response_at')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('status_id');
            $table->index('priority_id');
            $table->index('department_id');
            $table->index('assignee_id');
            $table->index('customer_id');
            $table->index('created_at');
            $table->index('updated_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};
