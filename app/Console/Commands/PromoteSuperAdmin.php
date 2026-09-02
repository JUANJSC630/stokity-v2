<?php

namespace App\Console\Commands;

use App\Models\Branch;
use App\Models\CashSession;
use App\Models\Expense;
use App\Models\Sale;
use App\Models\StockMovement;
use App\Models\User;
use App\Tenancy\TenantScope;
use Illuminate\Console\Command;

/**
 * Promotes an EXISTING tenant user to platform super-admin (tenant_id = null).
 *
 * Unlike tenancy:make-super-admin (which only creates a brand-new account with
 * a fresh email), this converts an account that already operates a tenant —
 * so it must refuse when that account is referenced by historical rows: once
 * tenant_id is null, TenantScope hides the user from any tenant-scoped query,
 * and belongsTo relations like Sale::seller() or CashSession::openedBy() would
 * silently resolve to null for other users in that tenant.
 */
class PromoteSuperAdmin extends Command
{
    protected $signature = 'tenancy:promote-super-admin
                            {email : Email of the existing user to promote}
                            {--force : Skip the confirmation prompt and the historical-data check}';

    protected $description = 'Promote an existing tenant user to platform super-admin (no tenant)';

    public function handle(): int
    {
        $email = $this->argument('email');
        $user = User::withoutGlobalScope(TenantScope::class)->where('email', $email)->first();

        if (! $user) {
            $this->error("No existe ningún usuario con el email {$email}.");

            return self::FAILURE;
        }

        if ($user->isSuperAdmin()) {
            $this->info("{$user->email} ya es super-admin (id {$user->id}).");

            return self::SUCCESS;
        }

        $this->info("Usuario encontrado: {$user->name} <{$user->email}> — rol actual: {$user->role}, tenant_id: ".($user->tenant_id ?? 'null'));

        if (! $this->option('force') && ($blockers = $this->historicalReferences($user))->isNotEmpty()) {
            $this->error('No se puede promover: este usuario tiene datos históricos que dependen de su tenant_id:');
            foreach ($blockers as $label => $count) {
                $this->line("  - {$label}: {$count}");
            }
            $this->warn('Al quedar sin tenant, esos registros dejarían de mostrar a este usuario (vendedor, quien abrió/cerró caja, etc.) para el resto del negocio.');
            $this->line('Usa --force solo si entiendes y aceptas ese efecto.');

            return self::FAILURE;
        }

        if (! $this->option('force')) {
            if (! $this->confirm("¿Promover a {$user->email} a super-admin? Perderá acceso operativo al tenant actual (POS, ventas, etc.) con esta cuenta.")) {
                $this->comment('Cancelado.');

                return self::SUCCESS;
            }
        }

        $user->forceFill([
            'role' => User::ROLE_SUPER_ADMIN,
            'tenant_id' => null,
            'branch_id' => null,
        ])->save();

        $this->info("Listo: {$user->email} (id {$user->id}) ahora es super-admin.");

        return self::SUCCESS;
    }

    /**
     * @return \Illuminate\Support\Collection<string, int<1, max>>
     */
    private function historicalReferences(User $user): \Illuminate\Support\Collection
    {
        return collect([
            'Ventas como vendedor' => Sale::withoutGlobalScope(TenantScope::class)->where('seller_id', $user->id)->count(),
            'Sesiones de caja abiertas' => CashSession::withoutGlobalScope(TenantScope::class)->where('opened_by_user_id', $user->id)->count(),
            'Sesiones de caja cerradas' => CashSession::withoutGlobalScope(TenantScope::class)->where('closed_by_user_id', $user->id)->count(),
            'Sucursales que administra' => Branch::withoutGlobalScope(TenantScope::class)->where('manager_id', $user->id)->count(),
            'Movimientos de stock' => StockMovement::withoutGlobalScope(TenantScope::class)->where('user_id', $user->id)->count(),
            'Gastos registrados' => Expense::withoutGlobalScope(TenantScope::class)->where('user_id', $user->id)->count(),
        ])->filter(fn (int $count) => $count > 0);
    }
}
