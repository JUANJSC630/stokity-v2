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
        Schema::create('tenant_api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            // First 8 chars of the plaintext key, shown in the admin UI so a
            // key can be told apart from another without ever storing or
            // displaying the secret itself again after creation.
            $table->string('key_prefix', 8);
            // SHA-256 hash of the plaintext key. Hashed (not bcrypt) on
            // purpose: this needs a fast, deterministic equality lookup on
            // every public API request, not a slow one-way KDF meant for
            // low-entropy human passwords — the key itself is a
            // high-entropy random token, so a fast hash is not a weaker
            // defense here, only a faster one.
            $table->string('hashed_key', 64)->unique();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'revoked_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tenant_api_keys');
    }
};
