<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Check if admin user already exists
        if (!User::where('email', 'admin@example.com')->exists()) {
            // Create admin user
            User::factory()->create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'role' => 'administrador',
            ]);
        }

        // Check if test user already exists
        if (!User::where('email', 'test@example.com')->exists()) {
            // Create regular user
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }
        
        // Check if there are already managers
        $managerCount = User::where('role', 'encargado')->count();
        if ($managerCount < 3) {
            // Create some manager users
            $managersToCreate = 3 - $managerCount;
            $managers = User::factory($managersToCreate)->create(['role' => 'encargado']);
        } else {
            // Use existing managers
            $managers = User::where('role', 'encargado')->limit(3)->get();
        }
        
        // Check if there are branches
        $branchCount = Branch::count();
        $branches = [];
        
        if ($branchCount < 3) {
            // Create branches for managers
            foreach ($managers as $manager) {
                // Check if manager already has a branch
                if (!Branch::where('manager_id', $manager->id)->exists()) {
                    $branches[] = Branch::factory()->create([
                        'name' => fake()->company(),
                        'manager_id' => $manager->id
                    ]);
                } else {
                    $branches[] = Branch::where('manager_id', $manager->id)->first();
                }
            }
            
            // Create additional branches if needed
            $additionalBranches = max(0, 2 - (count($branches) - count($managers)));
            if ($additionalBranches > 0) {
                $branches = array_merge($branches, Branch::factory($additionalBranches)->create()->all());
            }
            
            // Create an inactive branch if none exists
            if (!Branch::where('status', false)->exists()) {
                Branch::factory()->inactive()->create([
                    'name' => 'Inactive Branch'
                ]);
            }
        } else {
            // Use existing branches
            $branches = Branch::where('status', true)->limit(5)->get()->all();
        }
        
        // Check if there are categories
        $categoryCount = Category::count();
        if ($categoryCount < 5) {
            // Create categories
            $categoriesToCreate = 5 - $categoryCount;
            $categories = array_merge(
                Category::all()->all(),
                Category::factory($categoriesToCreate)->create()->all()
            );
        } else {
            // Use existing categories
            $categories = Category::all();
        }
        
        // Create products for each branch and category if not many products exist
        $productCount = Product::count();
        if ($productCount < 50) {
            foreach ($branches as $branch) {
                foreach ($categories as $category) {
                    // Check if there are products for this branch and category
                    $existingProducts = Product::where('branch_id', $branch->id)
                        ->where('category_id', $category->id)
                        ->count();
                    
                    if ($existingProducts < 3) {
                        // Create 2-5 products per category per branch
                        $productsCount = rand(2, 5);
                        Product::factory($productsCount)->create([
                            'branch_id' => $branch->id,
                            'category_id' => $category->id,
                        ]);
                        
                        // Create 1 low stock product per category per branch
                        if (!Product::where('branch_id', $branch->id)
                            ->where('category_id', $category->id)
                            ->whereRaw('stock <= min_stock')
                            ->exists()) {
                            Product::factory()->lowStock()->create([
                                'branch_id' => $branch->id,
                                'category_id' => $category->id,
                            ]);
                        }
                        
                        // Create 1 inactive product per category per branch
                        if (!Product::where('branch_id', $branch->id)
                            ->where('category_id', $category->id)
                            ->where('status', false)
                            ->exists()) {
                            Product::factory()->inactive()->create([
                                'branch_id' => $branch->id,
                                'category_id' => $category->id,
                            ]);
                        }
                    }
                }
            }
        }
        
        // Seed clients if table is empty
        if (Client::count() === 0) {
            $this->call(ClientSeeder::class);
        }
        
        // Seed sales if table is empty
        if (Sale::count() === 0) {
            $this->call(SaleSeeder::class);
        }
    }
}
