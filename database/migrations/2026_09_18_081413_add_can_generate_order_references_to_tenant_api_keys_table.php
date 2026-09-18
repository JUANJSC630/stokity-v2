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
            // Independent of can_manage_media — a key that manages product
            // photos/visibility doesn't automatically get to mint order
            // reference numbers, and vice versa. Defaults to false for the
            // same reason can_manage_media does: no key gains a new write
            // capability retroactively just because the column now exists.
            $table->boolean('can_generate_order_references')->default(false)->after('can_manage_media');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            $table->dropColumn('can_generate_order_references');
        });
    }
};
