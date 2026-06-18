<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTransactionalData extends Command
{
    protected $signature = 'db:clean-transactional
                            {--force : Skip confirmation prompt (required in non-interactive environments)}';

    protected $description = 'Truncate all business data (sales, products, etc.) keeping users, business_settings and branches';

    /**
     * Tables to truncate. Ordered children-before-parents for readability;
     * FK checks are disabled during truncation so order is not strictly required.
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
        $this->warn('⚠️  This will permanently delete ALL business data:');
        $this->line(implode(', ', $this->tables));
        $this->newLine();
        $this->info('✅ Preserved: users, business_settings, branches');
        $this->newLine();

        if (! $this->option('force') && ! $this->confirm('Are you sure? This cannot be undone.')) {
            $this->info('Aborted.');

            return self::SUCCESS;
        }

        $this->info('Cleaning...');

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        foreach ($this->tables as $table) {
            if (! DB::getSchemaBuilder()->hasTable($table)) {
                $this->line("  - {$table} (skipped, table not found)");

                continue;
            }
            DB::table($table)->truncate();
            $this->line("  ✓ {$table}");
        }

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');

        $this->newLine();
        $this->info('Done. Database cleaned successfully.');
        $this->info('Users preserved: '.DB::table('users')->count());

        return self::SUCCESS;
    }
}
