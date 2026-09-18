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
        Schema::create('storefront_order_counters', function (Blueprint $table) {
            $table->id();
            // Unique, not just indexed: StorefrontOrderCounter::claimNext()
            // relies on there being at most one row per tenant to lock —
            // see its docblock for the insertOrIgnore + lockForUpdate
            // sequence that keeps concurrent claims from ever returning the
            // same number.
            $table->foreignId('tenant_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('next_number')->default(1);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('storefront_order_counters');
    }
};
