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
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            // Defaults to true so every key that exists today keeps reading
            // the catalog. Only an "orders-only" key is issued with false.
            $table->boolean('can_read_catalog')->default(true)->after('can_generate_order_references');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            $table->dropColumn('can_read_catalog');
        });
    }
};
