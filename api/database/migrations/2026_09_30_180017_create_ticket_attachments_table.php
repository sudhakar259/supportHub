<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->ulid('id')->primary();
            $table->foreignUlid('ticket_id')->constrained('tickets')->cascadeOnDelete();
            $table->foreignUlid('ticket_message_id')->nullable()->constrained('ticket_messages')->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('disk', 40);
            $table->string('path');
            $table->string('original_filename');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size'); // bytes

            $table->timestamps();
            $table->softDeletes();

            $table->index('ticket_id');
            $table->index('ticket_message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attachments');
    }
};
