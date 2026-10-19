<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->boolean('web_store_enabled')->default(false)->after('plan');
        });

        $withActiveKey = DB::table('tenant_api_keys')->whereNull('revoked_at')->distinct()->pluck('tenant_id');
        DB::table('tenants')->whereIn('id', $withActiveKey)->update(['web_store_enabled' => true]);
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('web_store_enabled');
        });
    }
};
