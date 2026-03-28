<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('seller_id')->constrained('users');
            $table->string('code')->unique();
            $table->enum('type', ['layaway', 'installments', 'due_date', 'hold']);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2);
            $table->unsignedInteger('installments_count')->nullable();
            $table->decimal('installment_amount', 12, 2)->nullable();
            $table->date('due_date')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'overdue', 'completed', 'cancelled'])->default('active');
            $table->timestamps();

            $table->index(['branch_id', 'status']);
            $table->index(['client_id', 'status']);
            $table->index(['type', 'status']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_sales');
    }
};
