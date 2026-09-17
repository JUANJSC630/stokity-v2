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
            // Was 8 chars — that's the exact length of the literal "sk_store"
            // prefix alone, so every key stored an identical, useless value.
            // 16 carries real random entropy past the constant part.
            $table->string('key_prefix', 16)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenant_api_keys', function (Blueprint $table) {
            $table->string('key_prefix', 8)->change();
        });
    }
};
