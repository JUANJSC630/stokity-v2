<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wholesale_sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wholesale_sale_id')->constrained('wholesale_sales')->cascadeOnDelete();
            $table->string('description');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();

            $table->index('wholesale_sale_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wholesale_sale_items');
    }
};
