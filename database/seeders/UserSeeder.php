<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Crear solo un usuario por cada rol principal, asignando sucursal Zarzal
        $branch = \App\Models\Branch::where('name', 'Zarzal')->first();

        dump($branch);
        $branchId = $branch ? $branch->id : null;
        $roles = [
            'administrador',
            'encargado',
            'vendedor',
        ];
        foreach ($roles as $role) {
            $email = $role . '@example.com';
            if (!User::where('email', $email)->exists()) {
                User::factory()->create([
                    'name' => ucfirst($role) . ' User',
                    'email' => $email,
                    'role' => $role,
                    'branch_id' => $branchId,
                ]);
            }
        }
    }
}
