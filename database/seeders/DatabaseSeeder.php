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

        // Test/development data — never run in production
        if (app()->environment('local', 'testing')) {
            if (User::count() === 0) {
                $this->call(UserSeeder::class);
            }
            if (Branch::count() === 0) {
                $this->call(BranchSeeder::class);
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
