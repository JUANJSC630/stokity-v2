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
        // Crear usuario administrador
        if (!User::where('email', 'admin@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Admin User',
                'email' => 'admin@example.com',
                'role' => 'administrador',
            ]);
        }

        // Crear usuario de prueba
        if (!User::where('email', 'test@example.com')->exists()) {
            User::factory()->create([
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);
        }

        // Crear encargados (mínimo 3)
        $managerCount = User::where('role', 'encargado')->count();
        if ($managerCount < 3) {
            $managersToCreate = 3 - $managerCount;
            User::factory($managersToCreate)->create(['role' => 'encargado']);
        }

        // Crear un usuario para cada rol principal si no existe
        $roles = [
            'administrador',
            'encargado',
            'vendedor',
            'cajero',
        ];
        foreach ($roles as $role) {
            $email = $role . '@example.com';
            if (!User::where('email', $email)->exists()) {
                User::factory()->create([
                    'name' => ucfirst($role) . ' User',
                    'email' => $email,
                    'role' => $role,
                ]);
            }
        }
    }
}
