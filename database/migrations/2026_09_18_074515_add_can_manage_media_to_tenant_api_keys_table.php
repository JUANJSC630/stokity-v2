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
            // Opt-in, defaults to false so every key that already exists
            // (issued before this column existed) does NOT retroactively
            // gain write access to a tenant's catalog — see
            // TenantApiKey::generate()'s docblock. An operator who wants an
            // existing integration to have it must regenerate the key from
            // the SuperAdmin panel with the checkbox on, same workflow as
            // revoking one.
            $table->boolean('can_manage_media')->default(false)->after('hashed_key');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            $table->dropColumn('can_manage_media');
        });
    }
};
