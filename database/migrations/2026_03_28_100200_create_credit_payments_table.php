<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_sale_id')->constrained('credit_sales')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('payment_method');
            $table->foreignId('registered_by')->constrained('users');
            $table->foreignId('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();
            $table->dateTime('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('credit_sale_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_payments');
    }
};
