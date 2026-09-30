<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Administrator-configurable ticket number generation. A new row is
     * inserted (rather than the active row mutated) whenever configuration
     * changes, so historical tickets keep the number they were generated
     * with under the settings that were active at creation time.
     */
    public function up(): void
    {
        Schema::create('ticket_number_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('prefix', 20)->default('TKT');
            // Supports {prefix} {number} {year} {month} {day} {department} {department_code}
            $table->string('format')->default('{prefix}-{year}-{number}');
            $table->unsignedBigInteger('starting_number')->default(1);
            $table->unsignedTinyInteger('number_length')->default(6);
            $table->string('reset_period', 10)->default('yearly'); // never, yearly, monthly, daily
            $table->boolean('is_active')->default(true);
            $table->timestamp('effective_from')->useCurrent();
            $table->timestamps();

            $table->index(['department_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_number_settings');
    }
};
