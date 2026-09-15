<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wholesale_sales', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->nullable();
            $table->foreignId('branch_id')->constrained('branches');
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('seller_id')->constrained('users');
            $table->foreignId('sale_id')->nullable()->constrained('sales')->nullOnDelete();
            $table->string('code');
            $table->decimal('total', 12, 2);
            $table->decimal('estimated_cost', 12, 2)->nullable();
            $table->string('payment_method');
            $table->dateTime('date');
            $table->string('status')->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('tenant_id');
            $table->unique(['tenant_id', 'code']);
            $table->index(['branch_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_sales');
    }
};
