<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inbound_emails', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            // The email's own Message-ID: dedupes Mailgun's retries and lets a
            // reply find the thread it belongs to via In-Reply-To / References.
            $table->string('message_id', 255)->nullable();
            $table->string('from_email');
            $table->string('from_name')->nullable();
            $table->string('subject', 255)->nullable();
            $table->string('recipient');
            // processing, ticket_created, reply_added, ignored_*, rejected_*, failed
            $table->string('status', 40)->default('processing');
            $table->ulid('ticket_id')->nullable();
            $table->unsignedTinyInteger('attachments_saved')->default(0);
            $table->unsignedTinyInteger('attachments_skipped')->default(0);
            $table->text('note')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'message_id']);
            $table->index(['tenant_id', 'created_at']);
            $table->index('ticket_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inbound_emails');
    }
};
