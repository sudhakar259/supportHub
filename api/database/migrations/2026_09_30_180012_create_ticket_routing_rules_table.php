<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_routing_rules', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('priority')->default(0); // evaluation order, lower runs first
            $table->boolean('is_active')->default(true);
            $table->boolean('stop_processing')->default(false); // stop evaluating further rules once matched

            // [{ "field": "category_id", "operator": "=", "value": 3 }, ...] (AND-combined)
            $table->json('conditions');

            // [{ "type": "assign_department", "value": 2 }, { "type": "set_priority", "value": 4 }, ...]
            $table->json('actions');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['is_active', 'priority']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_routing_rules');
    }
};
