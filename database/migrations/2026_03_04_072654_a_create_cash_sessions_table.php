<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('cash_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained()->cascadeOnDelete();
            $table->foreignId('opened_by_user_id')->constrained('users');
            $table->foreignId('closed_by_user_id')->nullable()->constrained('users');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->decimal('opening_amount', 12, 2)->default(0);
            $table->text('opening_notes')->nullable();
            $table->timestamp('opened_at');
            $table->decimal('closing_amount_declared', 12, 2)->nullable();
            $table->text('closing_notes')->nullable();
            $table->timestamp('closed_at')->nullable();
            // Cached/computed at close
            $table->decimal('total_sales_cash', 12, 2)->default(0);
            $table->decimal('total_sales_card', 12, 2)->default(0);
            $table->decimal('total_sales_transfer', 12, 2)->default(0);
            $table->decimal('total_sales_other', 12, 2)->default(0);
            $table->decimal('total_cash_in', 12, 2)->default(0);
            $table->decimal('total_cash_out', 12, 2)->default(0);
            $table->decimal('total_refunds_cash', 12, 2)->default(0);
            $table->decimal('expected_cash', 12, 2)->nullable();
            $table->decimal('discrepancy', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_sessions');
    }
};
