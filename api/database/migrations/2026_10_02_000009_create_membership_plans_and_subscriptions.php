<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Both tables are platform-level (membership_plans has no tenant_id
     * at all — it's DeskZeal's own catalog; subscriptions.tenant_id
     * identifies WHICH tenant it belongs to but subscriptions isn't
     * tenant-owned in the BelongsToTenant sense — a tenant can read its
     * own subscription but never create/modify one directly, only a
     * platform admin does. See SubscriptionController vs
     * PlatformSubscriptionController.
     */
    public function up(): void
    {
        Schema::create('membership_plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->unsignedInteger('price_cents')->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('billing_interval', 20)->default('monthly'); // monthly, yearly
            // { "users": 10, "customers": 500, "tickets_per_month": 1000,
            //   "departments": 5, "api_requests_per_day": 5000,
            //   "webhooks": 3, "storage_mb": 1024 } — null value = unlimited
            $table->json('limits');
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('membership_plan_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('trial'); // trial, active, past_due, cancelled, suspended, expired
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('current_period_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('membership_plans');
    }
};
