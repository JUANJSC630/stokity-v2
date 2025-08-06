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
        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Nombre mostrado al usuario
            $table->string('code')->unique(); // Código interno (cash, transfer, etc.)
            $table->text('description')->nullable(); // Descripción opcional
            $table->boolean('is_active')->default(true); // Si está activo o no
            $table->integer('sort_order')->default(0); // Orden de aparición
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_methods');
    }
}; 