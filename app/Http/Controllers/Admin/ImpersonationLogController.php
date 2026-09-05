<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\TenantImpersonation;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ImpersonationLogController extends Controller
{
    /**
     * Platform-wide "enter as this user" audit trail — see
     * TenantController::impersonate()/ImpersonationController::stop().
     * Optionally scoped to one tenant via ?tenant_id=, e.g. from a link on
     * that tenant's detail page.
     */
    public function index(Request $request): Response
    {
        $tenantId = $request->integer('tenant_id') ?: null;

        // withTrashed() on every relation: the whole point of nullOnDelete()
        // on this table is that the log survives a user/tenant being
        // removed later — a *soft* delete (the normal "eliminar usuario" /
        // "archivar negocio" flow) must not silently blank out attribution
        // just because the default query scope excludes trashed rows.
        $logs = TenantImpersonation::query()
            ->with([
                'superAdmin' => fn ($q) => $q->allTenants()->withTrashed()->select('id', 'name', 'email'),
                'tenant' => fn ($q) => $q->withTrashed()->select('id', 'name'),
                'impersonatedUser' => fn ($q) => $q->allTenants()->withTrashed()->select('id', 'name', 'email'),
            ])
            ->when($tenantId, fn ($q) => $q->where('tenant_id', $tenantId))
            ->latest('started_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/impersonations/index', [
            'logs' => $logs,
            'tenantId' => $tenantId,
        ]);
    }
}
