<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_credentials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key', 40)->unique();
            // The secret itself is never stored — only its hash, exactly
            // like a password. It is shown to the tenant admin once, at
            // creation/rotation time, in the API response, and never again.
            $table->string('secret_hash');
            $table->string('secret_last_four', 4);
            $table->json('scopes');
            $table->string('status', 20)->default('active'); // active, revoked
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_credentials');
    }
};
