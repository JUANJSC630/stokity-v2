<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\TenantImpersonation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cookie;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'canResetPassword' => false,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        // Update last_login_at for the user
        $request->user()->updateLastLogin();

        // Platform owners always land on the admin panel (not a stored intended URL).
        if ($request->user()->isSuperAdmin()) {
            return redirect()->route('admin.tenants.index');
        }

        // Remembers this browser's business so the pre-login pages (welcome,
        // the login form itself) show its real name/logo/colors on a future
        // visit instead of the generic Stokity default — see
        // HandleInertiaRequests::resolveBusinessSettings(). Never set for a
        // super-admin login (handled above), so their own device browsing
        // never "sticks" to whichever tenant they last checked on.
        if ($tenant = $request->user()->tenant) {
            Cookie::queue('last_tenant', $tenant->slug, 60 * 24 * 365);
        }

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        // If the user logs out mid-impersonation instead of using "Salir"
        // (ImpersonationController::stop), close the log here so it never
        // stays open indefinitely.
        if ($request->session()->has('impersonator_id')) {
            TenantImpersonation::close($request->session()->get('impersonation_log_id'));
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
