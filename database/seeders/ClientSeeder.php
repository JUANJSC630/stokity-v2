<?php

namespace Database\Seeders;

use App\Models\Client;
use Illuminate\Database\Seeder;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Client::firstOrCreate([
            'name' => 'Anónimo',
        ], [
            'document' => '0000000000',
            'phone' => '3000000000',
            'address' => 'Sin dirección',
            'email' => 'anonimo@cliente.com',
            'birthdate' => '1990-01-01',
        ]);

        $clientes = [
            ['name' => 'Juan Pérez', 'document' => '1122334455', 'phone' => '3123456781', 'address' => 'Calle 10 #5-20, Zarzal', 'email' => 'juan.perez@gmail.com', 'birthdate' => '1985-03-15'],
            ['name' => 'María Rodríguez', 'document' => '2233445566', 'phone' => '3123456782', 'address' => 'Cra 8 #12-34, Cartago', 'email' => 'maria.rodriguez@gmail.com', 'birthdate' => '1992-07-22'],
            ['name' => 'Carlos Gómez', 'document' => '3344556677', 'phone' => '3123456783', 'address' => 'Av. Principal #1-10, La Victoria', 'email' => 'carlos.gomez@gmail.com', 'birthdate' => '1978-11-05'],
            ['name' => 'Ana Martínez', 'document' => '4455667788', 'phone' => '3123456784', 'address' => 'Calle 3 #2-30, Obando', 'email' => 'ana.martinez@gmail.com', 'birthdate' => '1995-02-28'],
            ['name' => 'Luis Torres', 'document' => '5566778899', 'phone' => '3123456785', 'address' => 'Cra 7 #4-50, La Unión', 'email' => 'luis.torres@gmail.com', 'birthdate' => '1980-09-10'],
            ['name' => 'Paola Ramírez', 'document' => '6677889900', 'phone' => '3123456786', 'address' => 'Calle 15 #6-40, Toro', 'email' => 'paola.ramirez@gmail.com', 'birthdate' => '1993-12-12'],
            ['name' => 'Jorge Herrera', 'document' => '7788990011', 'phone' => '3123456787', 'address' => 'Cra 9 #8-22, Zarzal', 'email' => 'jorge.herrera@gmail.com', 'birthdate' => '1988-06-18'],
            ['name' => 'Diana Castro', 'document' => '8899001122', 'phone' => '3123456788', 'address' => 'Calle 20 #10-15, Cartago', 'email' => 'diana.castro@gmail.com', 'birthdate' => '1991-04-09'],
            ['name' => 'Andrés Ruiz', 'document' => '9900112233', 'phone' => '3123456789', 'address' => 'Av. 3N #45-67, La Victoria', 'email' => 'andres.ruiz@gmail.com', 'birthdate' => '1983-08-25'],
        ];
        foreach ($clientes as $data) {
            Client::firstOrCreate([
                'document' => $data['document']
            ], $data);
        }
    }
}
