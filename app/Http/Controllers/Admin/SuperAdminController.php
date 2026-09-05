<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Lets a super admin create and manage other platform owners from the UI,
 * instead of only via the tenancy:make-super-admin console command.
 *
 * Deliberately does NOT expose tenancy:promote-super-admin's "convert an
 * existing tenant user" flow here — that command has deliberately complex
 * historical-data guards (see its own docblock) that aren't worth
 * replicating in a UI shortcut for something this hard to safely undo.
 */
class SuperAdminController extends Controller
{
    public function index(): Response
    {
        $superAdmins = User::allTenants()
            ->where('role', User::ROLE_SUPER_ADMIN)
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'status', 'last_login_at', 'created_at']);

        return Inertia::render('admin/super-admins/index', ['superAdmins' => $superAdmins]);
    }

    public function create(): Response
    {
        return Inertia::render('admin/super-admins/create');
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => User::ROLE_SUPER_ADMIN,
            'branch_id' => null,
            'status' => true,
            'email_verified_at' => now(),
            // tenant_id stays null: BelongsToTenant only stamps it when a
            // tenant is in context, which is never true for a super admin.
        ]);

        return redirect()->route('admin.super-admins.index')->with('success', "Super admin «{$validated['name']}» creado.");
    }

    /**
     * Activate/deactivate a super admin. Two lockout guards: you can't lock
     * yourself out, and the platform can never be left with zero active
     * super admins — same "don't remove the last one who can act" spirit as
     * RoleGuardService's settings.roles.manage check.
     */
    public function toggleStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($user->isSuperAdmin(), 404);

        if ($user->is($request->user())) {
            return back()->withErrors(['status' => 'No puedes desactivar tu propia cuenta.']);
        }

        $activating = ! $user->status;

        if (! $activating) {
            $otherActiveCount = User::allTenants()
                ->where('role', User::ROLE_SUPER_ADMIN)
                ->where('id', '!=', $user->id)
                ->where('status', true)
                ->count();

            if ($otherActiveCount === 0) {
                return back()->withErrors(['status' => 'No puedes desactivar al único super admin activo.']);
            }
        }

        $user->update(['status' => $activating]);

        $verb = $activating ? 'activado' : 'desactivado';

        return back()->with('success', "Super admin «{$user->name}» {$verb}.");
    }
}
