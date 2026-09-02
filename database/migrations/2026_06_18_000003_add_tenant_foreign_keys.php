<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PR-3 (multi-tenancy) — referential integrity.
 *
 * Adds the tenant_id foreign key on every business table. The column remains
 * NULLABLE for now (FKs allow NULL), so new rows created before the trait is
 * applied (PR-4) won't fail. The existing tenant index (PR-2) backs the FK.
 *
 * NOT NULL is enforced in the later "finalize" migration once all writes stamp
 * tenant_id.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $tables = [
        'business_settings', 'branches', 'users', 'archived_users', 'categories',
        'products', 'clients', 'payment_methods', 'suppliers', 'sales',
        'sale_products', 'sale_returns', 'sale_return_products', 'stock_movements',
        'cash_sessions', 'cash_movements', 'credit_sales', 'credit_sale_items',
        'credit_payments', 'expenses', 'expense_categories', 'expense_templates',
        'product_supplier',
    ];

    public function up(): void
    {
        foreach ($this->tables as $name) {
            if (! Schema::hasTable($name) || ! Schema::hasColumn($name, 'tenant_id')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) {
                $table->foreign('tenant_id')
                    ->references('id')
                    ->on('tenants')
                    ->restrictOnDelete(); // never cascade-delete a whole tenant's data implicitly
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $name) {
            if (! Schema::hasTable($name) || ! Schema::hasColumn($name, 'tenant_id')) {
                continue;
            }

            Schema::table($name, function (Blueprint $table) {
                $table->dropForeign(['tenant_id']);
            });
        }
    }
};
