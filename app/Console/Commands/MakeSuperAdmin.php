<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;

class MakeSuperAdmin extends Command
{
    protected $signature = 'tenancy:make-super-admin
                            {name : Full name}
                            {email : Login email (must be unique)}';

    protected $description = 'Create a platform super-admin (no tenant) that manages every business from /admin';

    public function handle(): int
    {
        $name = $this->argument('name');
        $email = $this->argument('email');
        $password = $this->secret('Password (min 8 chars)');

        $validator = Validator::make(
            ['name' => $name, 'email' => $email, 'password' => $password],
            [
                'name' => 'required|string|max:255',
                'email' => 'required|email|max:255|unique:users,email',
                'password' => ['required', Password::min(8)],
            ]
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => User::ROLE_SUPER_ADMIN,
            'tenant_id' => null,
            'branch_id' => null,
            'status' => true,
            'email_verified_at' => now(),
        ]);

        $this->info("Super-admin creado: {$user->email} (id {$user->id}).");

        return self::SUCCESS;
    }
}
