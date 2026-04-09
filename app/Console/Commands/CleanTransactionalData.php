<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class CleanTransactionalData extends Command
{
    protected $signature = 'db:clean-transactional
                            {--force : Skip confirmation prompt (required in non-interactive environments)}';

    protected $description = 'Truncate all transactional data (sales, products, stock, etc.) keeping users and settings';

    private array $tables = [
        'credit_payments',
        'credit_sale_items',
        'credit_sales',
        'sale_products',
        'sale_return_items',
        'sale_returns',
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
    ];

    public function handle(): int
    {
        $this->warn('⚠️  This will permanently delete ALL transactional data:');
        $this->line(implode(', ', $this->tables));
        $this->newLine();
        $this->info('✅ Preserved: users, branches, business_settings');
        $this->newLine();

        if (! $this->option('force') && ! $this->confirm('Are you sure? This cannot be undone.')) {
            $this->info('Aborted.');
            return self::SUCCESS;
        }

        $this->info('Cleaning...');

        DB::statement('SET FOREIGN_KEY_CHECKS = 0');

        foreach ($this->tables as $table) {
            DB::table($table)->truncate();
            $this->line("  ✓ {$table}");
        }

        DB::statement('SET FOREIGN_KEY_CHECKS = 1');

        $this->newLine();
        $this->info('Done. Database cleaned successfully.');

        return self::SUCCESS;
    }
}
