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
            // Null means "the platform default" (TenantApiKey::DEFAULT_RATE_LIMIT_PER_MINUTE,
            // 60 — what every key had before this column existed), so no
            // existing key changes behavior. Applies to each of the three
            // rate-limit buckets (read / write / orders) separately.
            $table->unsignedInteger('rate_limit_per_minute')->nullable()->after('can_generate_order_references');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            $table->dropColumn('rate_limit_per_minute');
        });
    }
};
