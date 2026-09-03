<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Production-safe seeders (configuration / catalog data)
        if (\App\Models\PaymentMethod::count() === 0) {
            $this->call(PaymentMethodSeeder::class);
        }
        if (\App\Models\ExpenseCategory::count() === 0) {
            $this->call(ExpenseCategorySeeder::class);
        }
        // Unconditional: firstOrCreate() never touches an existing row, so this
        // is always a cheap no-op after the first run. A count-based guard here
        // would be unreliable — Permission::count() also includes any other
        // guard or a permission added by hand through a future role-management
        // UI, so it can never be safely compared against the catalog's size.
        $this->call(PermissionSeeder::class);

        // Test/development data — never run in production
        if (app()->environment('local', 'testing')) {
            // Branch must run before User: UserSeeder looks up the "Zarzal"
            // branch to assign non-admin users to, and finds nothing if it
            // runs first.
            if (Branch::count() === 0) {
                $this->call(BranchSeeder::class);
            }
            if (User::count() === 0) {
                $this->call(UserSeeder::class);
            }
            if (Category::count() === 0) {
                $this->call(CategorySeeder::class);
            }
            if (Product::count() === 0) {
                $this->call(ProductSeeder::class);
            }
            if (Client::count() === 0) {
                $this->call(ClientSeeder::class);
            }
            if (Sale::count() === 0) {
                $this->call(SaleSeeder::class);
            }
            if (\App\Models\StockMovement::count() === 0) {
                $this->call(StockMovementSeeder::class);
            }
        }
    }
}
