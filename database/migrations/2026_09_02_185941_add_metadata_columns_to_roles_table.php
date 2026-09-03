<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends Spatie's `roles` table with the metadata the granular-permissions
 * design needs on top of the package defaults:
 *
 * - is_default / is_system: the 3 seeded roles (Administrador, Encargado,
 *   Vendedor) are marked both — editable, but never deletable, so a tenant
 *   can't end up with zero usable roles.
 * - data_scope: the axis Spatie does NOT model. A permission answers "can
 *   this role do X"; data_scope answers "over which rows" (all branches vs.
 *   only its own vs. only what the user created). See
 *   app/Authorization/Concerns/ScopesToUserAccess.php (added when the scope
 *   is wired into controllers).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->boolean('is_default')->default(false)->after('guard_name');
            $table->boolean('is_system')->default(false)->after('is_default');
            $table->string('description')->nullable()->after('is_system');
            $table->enum('data_scope', ['all', 'branch', 'own'])->default('branch')->after('description');

            // Nullable + restrictOnDelete: same convention as the tenant_id FKs
            // added for multitenancy — never cascade-delete a tenant's roles
            // implicitly, and a role created before a team context existed
            // (console/tests) keeps a null tenant_id.
            $table->foreign('tenant_id')->references('id')->on('tenants')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['is_default', 'is_system', 'description', 'data_scope']);
        });
    }
};
