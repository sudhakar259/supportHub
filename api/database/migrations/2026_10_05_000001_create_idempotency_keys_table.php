<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('scope', 64);
            $table->string('key', 255);
            $table->char('request_hash', 64);
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->string('content_type')->nullable();
            $table->longText('response')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'scope', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('idempotency_keys');
    }
};
