<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 6 (multi-tenancy) — per-tenant uniqueness.
 *
 * Human-entered codes/identifiers can legitimately repeat across tenants, so
 * their global UNIQUE indexes become composite (tenant_id, <column>).
 *
 * Excluded on purpose:
 * - users.email — stays globally unique (login identity).
 * - product_supplier(product_id, supplier_id) — those ids are already
 *   tenant-bound, so the pair never crosses tenants.
 *
 * tenant_id stays NULLABLE; composite uniques treat NULLs as distinct, which is
 * fine since every production row is backfilled and new writes are stamped.
 */
return new class extends Migration
{
    /**
     * table => list of single columns whose unique index becomes (tenant_id, column).
     *
     * @var array<string, list<string>>
     */
    private array $map = [
        'products' => ['code'],
        'sales' => ['code'],
        'credit_sales' => ['code'],
        'payment_methods' => ['code'],
        'clients' => ['document', 'email'],
    ];

    public function up(): void
    {
        foreach ($this->map as $table => $columns) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                foreach ($columns as $column) {
                    $blueprint->dropUnique([$column]);                 // {table}_{column}_unique
                    $blueprint->unique(['tenant_id', $column]);
                }
            });
        }
    }

    public function down(): void
    {
        // Preflight: restoring a global unique fails if two tenants legitimately
        // reused the same value. Fail fast with a clear message before touching
        // the schema, instead of a cryptic duplicate-key error mid-rollback.
        foreach ($this->map as $table => $columns) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }

            foreach ($columns as $column) {
                // COUNT(*) > 1 catches any duplicate of $column (including rows
                // from the same tenant or rows with tenant_id = NULL), which is
                // the condition that would fail when restoring the global UNIQUE.
                $hasCrossTenantDupes = DB::table($table)
                    ->whereNotNull($column)
                    ->groupBy($column)
                    ->havingRaw('COUNT(*) > 1')
                    ->exists();

                if ($hasCrossTenantDupes) {
                    throw new RuntimeException(
                        "No se puede revertir: '{$table}.{$column}' tiene el mismo valor en varios tenants. ".
                        'Restaurar el índice único global rompería la integridad. Resuelve los duplicados primero.'
                    );
                }
            }
        }

        foreach ($this->map as $table => $columns) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($columns) {
                foreach ($columns as $column) {
                    $blueprint->dropUnique(['tenant_id', $column]);
                    $blueprint->unique([$column]);
                }
            });
        }
    }
};
