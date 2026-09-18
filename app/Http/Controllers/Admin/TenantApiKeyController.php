<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\TenantApiKey;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Issues and revokes the API keys that let an external storefront (see
 * LU_ACCESORIOS_STOREFRONT_PLAN.md) read a tenant's public catalog through
 * routes/api.php. Deliberately lives in the SuperAdmin panel only — a
 * tenant never self-serves its own key from /settings, so granting an
 * external integration access to a business's data always goes through the
 * platform owner, the same governance model as impersonation and role
 * editing elsewhere in this Admin\* namespace.
 */
class TenantApiKeyController extends Controller
{
    public function store(Request $request, Tenant $tenant): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'can_manage_media' => 'nullable|boolean',
            'can_generate_order_references' => 'nullable|boolean',
        ]);

        $result = TenantApiKey::generate(
            $tenant,
            $validated['name'],
            $request->user(),
            canManageMedia: $validated['can_manage_media'] ?? false,
            canGenerateOrderReferences: $validated['can_generate_order_references'] ?? false,
        );

        // Allowed even for a suspended/trial-expired tenant — an admin may
        // legitimately want to pre-provision a key before activating a new
        // business — but ResolveTenantFromApiKey will 403 every request on
        // it until the tenant is active, so say so now rather than let it
        // look like the integration itself is broken later.
        $successMessage = "API key «{$validated['name']}» generada para «{$tenant->name}».";
        if (! $tenant->isActive()) {
            $successMessage .= ' Nota: este negocio no está activo, así que la key no funcionará hasta que lo actives.';
        }

        return back()->with([
            'success' => $successMessage,
            // Shown exactly once in the UI — only the hash is ever persisted
            // (see TenantApiKey::generate()'s docblock).
            'plainApiKey' => $result['plainTextKey'],
        ]);
    }

    public function destroy(Tenant $tenant, TenantApiKey $apiKey): RedirectResponse
    {
        abort_unless($apiKey->tenant_id === $tenant->id, 404);

        $apiKey->revoke();

        return back()->with('success', "API key «{$apiKey->name}» revocada.");
    }
}
