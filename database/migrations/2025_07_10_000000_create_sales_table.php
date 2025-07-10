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
        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches');
            $table->string('code')->unique();
            $table->foreignId('client_id')->constrained('clients');
            $table->foreignId('seller_id')->constrained('users');
            $table->decimal('tax', 10, 2)->default(0);
            $table->decimal('net', 10, 2);
            $table->decimal('total', 10, 2);
            $table->string('payment_method');
            $table->dateTime('date');
            $table->string('status')->default('completed');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sales');
    }
};
