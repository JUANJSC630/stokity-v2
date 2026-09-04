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
        Schema::table('business_settings', function (Blueprint $table) {
            // Nullable, no DB-level default on purpose: BusinessSetting::
            // isModuleEnabled() treats a missing key (null column, or the
            // module simply absent from the JSON) as enabled — every
            // existing tenant keeps working exactly as today until an
            // admin explicitly turns something off from /settings/modules.
            $table->json('module_config')->nullable()->after('ticket_config');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('business_settings', function (Blueprint $table) {
            $table->dropColumn('module_config');
        });
    }
};
