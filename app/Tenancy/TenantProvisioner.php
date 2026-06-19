<?php

namespace App\Tenancy;

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Provisions a brand-new tenant with everything it needs to start operating:
 * business settings, an initial branch, an admin user, default payment methods
 * and the "Consumidor Final" default client. All baseline rows are created under
 * the tenant context so BelongsToTenant stamps tenant_id automatically.
 */
class TenantProvisioner
{
    public function __construct(private TenantManager $tenants) {}

    /**
     * @param  array{business_name: string, admin_name: string, admin_email: string, admin_password: string, branch_name?: string}  $data
     */
    public function create(array $data): Tenant
    {
        return DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['business_name'],
                'slug' => $this->uniqueSlug($data['business_name']),
                'status' => Tenant::STATUS_ACTIVE,
            ]);

            $this->tenants->runAs($tenant, function () use ($data) {
                BusinessSetting::create([
                    'name' => $data['business_name'],
                    'currency_symbol' => '$',
                ]);

                $branch = Branch::create([
                    'name' => $data['branch_name'] ?? 'Principal',
                    'business_name' => $data['business_name'],
                    'address' => 'Sin dirección',
                    'phone' => 'N/A',
                    'status' => true,
                ]);

                User::create([
                    'name' => $data['admin_name'],
                    'email' => $data['admin_email'],
                    'password' => Hash::make($data['admin_password']),
                    'role' => 'administrador',
                    'branch_id' => $branch->id,
                    'status' => true,
                    'email_verified_at' => now(),
                ]);

                $this->seedPaymentMethods();
                $this->seedDefaultClient();
            });

            return $tenant;
        });
    }

    private function seedPaymentMethods(): void
    {
        $methods = [
            ['name' => 'Efectivo', 'code' => 'cash', 'sort_order' => 0],
            ['name' => 'Tarjeta de Crédito', 'code' => 'credit_card', 'sort_order' => 1],
            ['name' => 'Tarjeta de Débito', 'code' => 'debit_card', 'sort_order' => 2],
            ['name' => 'Transferencia Bancaria', 'code' => 'bank_transfer', 'sort_order' => 3],
            ['name' => 'Nequi', 'code' => 'nequi', 'sort_order' => 4],
            ['name' => 'DaviPlata', 'code' => 'daviplata', 'sort_order' => 5],
        ];

        foreach ($methods as $method) {
            PaymentMethod::create([...$method, 'is_active' => true]);
        }
    }

    private function seedDefaultClient(): void
    {
        Client::create([
            'name' => 'Consumidor Final',
            'document' => '0000000000',
            'phone' => '3000000000',
            'address' => 'Sin direccion',
            'email' => 'sincorreo@cliente.com',
            'birthdate' => '1990-01-01',
        ]);
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'tenant';
        $slug = $base;
        $n = 1;

        while (Tenant::where('slug', $slug)->exists()) {
            $slug = $base.'-'.(++$n);
        }

        return $slug;
    }
}
