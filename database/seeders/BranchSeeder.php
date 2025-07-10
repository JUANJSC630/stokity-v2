<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $branches = [
            ['name' => 'Zarzal', 'address' => 'Cra 10 #5-20', 'phone' => '3123456789', 'email' => 'zarzal@sucursal.com'],
            ['name' => 'Cartago', 'address' => 'Calle 12 #8-15', 'phone' => '3123456790', 'email' => 'cartago@sucursal.com'],
            ['name' => 'La Victoria', 'address' => 'Av. Principal #1-10', 'phone' => '3123456791', 'email' => 'lavictoria@sucursal.com'],
            ['name' => 'Obando', 'address' => 'Calle 3 #2-30', 'phone' => '3123456792', 'email' => 'obando@sucursal.com'],
            ['name' => 'La Unión', 'address' => 'Cra 7 #4-50', 'phone' => '3123456793', 'email' => 'launion@sucursal.com'],
        ];
        foreach ($branches as $data) {
            Branch::firstOrCreate(['name' => $data['name']], $data);
        }
    }
}
