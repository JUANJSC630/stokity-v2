<?php

namespace App\Http\Controllers;

use App\Models\TenantImpersonation;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    /**
     * End an active impersonation and restore the super admin's own
     * session. Reachable by the impersonated (tenant) user, hence a plain
     * `auth` route outside the /admin, super_admin-gated group.
     */
    public function stop(Request $request): RedirectResponse
    {
        $impersonatorId = $request->session()->get('impersonator_id');

        abort_unless($impersonatorId, 403);

        // Always close the log and clear the impersonation session keys
        // first, before anything that could fail below — the audit trail
        // must never stay open just because the hand-back check fails.
        TenantImpersonation::close($request->session()->get('impersonation_log_id'));
        $request->session()->forget(['impersonator_id', 'impersonation_log_id']);

        // IdentifyTenant already scoped this request to the impersonated
        // user's tenant (they're the currently authenticated user). The
        // super admin has tenant_id = null, so a scoped lookup — including
        // the default auth guard's own retrieveById(), i.e. loginUsingId()
        // — would silently fail to find them. allTenants() bypasses that.
        $superAdmin = User::allTenants()->find($impersonatorId);

        // If the super admin was demoted or deleted while impersonating,
        // don't trust the stale session value to hand control back to them
        // — force a real re-login instead.
        if (! $superAdmin || ! $superAdmin->isSuperAdmin()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login');
        }

        Auth::login($superAdmin);

        return redirect()->route('admin.tenants.index');
    }
}
