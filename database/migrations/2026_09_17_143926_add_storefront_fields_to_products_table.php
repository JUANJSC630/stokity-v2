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
        Schema::table('products', function (Blueprint $table) {
            $table->boolean('show_in_storefront')->default(false)->after('status');
            // Nullable: existing products keep no slug until curated for the
            // storefront. MySQL allows multiple NULLs under a unique index,
            // so this doesn't block products that never opt in.
            $table->string('slug')->nullable()->after('show_in_storefront');
            $table->unique(['tenant_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'slug']);
            $table->dropColumn(['show_in_storefront', 'slug']);
        });
    }
};
