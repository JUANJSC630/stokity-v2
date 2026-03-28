<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('credit_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('credit_sale_id')->constrained('credit_sales')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products');
            $table->string('product_name');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('purchase_price_snapshot', 12, 2)->nullable();
            $table->timestamps();

            $table->index('credit_sale_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('credit_sale_items');
    }
};
