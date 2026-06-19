<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTransactionalData extends Command
{
    protected $signature = 'db:clean-transactional
                            {--tenant= : ID of the tenant whose data will be wiped (required)}
                            {--force : Skip confirmation prompt (required in non-interactive environments)}';

    protected $description = 'Delete one tenant\'s business data (sales, products, etc.) keeping its users, business_settings and branches';

    /**
     * Tables wiped for the tenant, ordered children-before-parents.
     * FK checks are disabled during the delete so order is not strictly required.
     *
     * @var list<string>
     */
    private array $tables = [
        'credit_payments',
        'credit_sale_items',
        'credit_sales',
        'sale_return_products',
        'sale_returns',
        'sale_products',
        'sales',
        'cash_movements',
        'cash_sessions',
        'stock_movements',
        'expenses',
        'expense_templates',
        'expense_categories',
        'product_supplier',
        'products',
        'clients',
        'suppliers',
        'categories',
        'payment_methods',
        'archived_users',
    ];

    public function handle(): int
    {
        $tenantId = $this->option('tenant');

        if (! $tenantId) {
            $this->error('Falta --tenant=ID. Por seguridad este comando solo borra los datos de UN negocio.');

            return self::FAILURE;
        }

        $tenant = Tenant::find($tenantId);

        if (! $tenant) {
            $this->error("No existe el tenant con id {$tenantId}.");

            return self::FAILURE;
        }

        $this->warn("⚠️  Borrará PERMANENTEMENTE los datos de negocio del tenant #{$tenant->id} «{$tenant->name}»:");
        $this->line(implode(', ', $this->tables));
        $this->newLine();
        $this->info('✅ Se conservan (de este tenant): users, business_settings, branches');
        $this->newLine();

        if (! $this->option('force') && ! $this->confirm('¿Seguro? Esto no se puede deshacer.')) {
            $this->info('Cancelado.');

            return self::SUCCESS;
        }

        $this->info('Limpiando...');

        DB::transaction(function () use ($tenantId) {
            // Break the sales <-> credit_sales FK cycle before deleting, so the
            // ordered children-before-parents deletes below never violate a FK
            // (works on both MySQL and SQLite without disabling FK checks).
            DB::table('sales')->where('tenant_id', $tenantId)->update(['credit_sale_id' => null]);

            foreach ($this->tables as $table) {
                if (! DB::getSchemaBuilder()->hasTable($table)) {
                    $this->line("  - {$table} (omitida, no existe)");

                    continue;
                }

                $deleted = DB::table($table)->where('tenant_id', $tenantId)->delete();
                $this->line("  ✓ {$table} ({$deleted})");
            }
        });

        $this->newLine();
        $this->info('Listo. Datos del tenant eliminados.');
        $this->info('Usuarios conservados (de este tenant): '.DB::table('users')->where('tenant_id', $tenantId)->count());

        return self::SUCCESS;
    }
}
