<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\Client;
use App\Models\Sale;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
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
    }
}
