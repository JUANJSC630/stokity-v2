<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create admin user
        User::factory()->admin()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);

        // Create regular user
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);
        
        // Create some manager users
        $managers = User::factory(3)->create(['role' => 'manager']);
        
        // Create branches
        foreach ($managers as $manager) {
            Branch::factory()->create([
                'name' => fake()->company(),
                'manager_id' => $manager->id
            ]);
        }
        
        // Create additional branches without managers
        Branch::factory(2)->create();
        
        // Create an inactive branch
        Branch::factory()->inactive()->create([
            'name' => 'Inactive Branch'
        ]);
    }
}
