<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('membership_plan_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('amount_cents');
            $table->string('currency', 3);
            $table->string('billing_interval', 20);
            $table->string('status', 20)->default('pending');
            $table->string('razorpay_order_id', 64)->nullable()->unique();
            $table->string('razorpay_payment_id', 64)->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
