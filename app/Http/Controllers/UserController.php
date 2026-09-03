<?php

namespace App\Http\Controllers;

use App\Authorization\DefaultRoleProvisioner;
use App\Models\ArchivedUser;
use App\Models\Branch;
use App\Models\Role;
use App\Models\User;
use App\Tenancy\TenantManager;
use App\Services\BlobStorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    public function __construct(private BlobStorageService $blobStorage) {}

    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        abort_unless(auth()->user()->can('users.view'), 403, 'No tienes permisos para ver usuarios.');

        $query = User::query();

        $with = ['branch'];

        $query->with($with);

        if ($request->has('search')) {
            $query->where(function ($q) use ($request) {
                $search = $request->search;
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('role', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('users/index', [
            'users' => $users,
            'filters' => $request->only('search'),
        ]);
    }

    /**
     * Show the form for creating a new user.
     */
    public function create()
    {
        abort_unless(auth()->user()->can('users.create'), 403, 'No tienes permisos para crear usuarios.');

        $branches = Branch::where('status', true)->get();

        return Inertia::render('users/create', [
            'branches' => $branches,
            'roles' => $this->assignableRoles(),
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        abort_unless(auth()->user()->can('users.create'), 403, 'No tienes permisos para crear usuarios.');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role_id' => ['required', Rule::exists('roles', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantManager::class)->id()))],
            'branch_id' => [
                Rule::requiredIf(fn () => Role::where('tenant_id', app(TenantManager::class)->id())->find($request->role_id)?->data_scope !== 'all'),
                'nullable',
                'exists:branches,id',
            ],
            'password' => 'required|string|min:8|confirmed',
            'status' => 'sometimes|boolean',
            'photo' => 'nullable|image|max:1024', // 1MB max
        ]);

        // Upload photo to Vercel Blob (persists across deploys, unlike local filesystem)
        if ($request->hasFile('photo')) {
            try {
                $validated['photo'] = $this->blobStorage->upload($request->file('photo'), 'users');
            } catch (\Exception $e) {
                \Log::error('Error al subir la foto: '.$e->getMessage());
            }
        }

        $role = Role::where('tenant_id', app(TenantManager::class)->id())->findOrFail($validated['role_id']);

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            // Legacy string column — approximated for a custom role, see
            // DefaultRoleProvisioner::legacyStringForRole().
            'role' => DefaultRoleProvisioner::legacyStringForRole($role),
            'branch_id' => $validated['branch_id'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'] ?? true,
            'photo' => $validated['photo'] ?? null,
        ]);

        $user->assignRole($role);

        // Si el usuario recibe el rol Encargado del sistema y una sucursal,
        // queda registrado como su gerente. Un rol personalizado no dispara
        // esto automáticamente — no hay forma de saber si un rol a medida
        // implica "gerente de sucursal"; el admin puede asignarlo a mano
        // desde Sucursales.
        if ($role->is_system && $role->name === DefaultRoleProvisioner::ENCARGADO && isset($validated['branch_id'])) {
            Branch::where('id', $validated['branch_id'])->update(['manager_id' => $user->id]);
        }

        return redirect()->route('users.index')
            ->with('success', 'Usuario creado exitosamente');
    }

    /**
     * Display the specified user.
     */
    public function show(User $user)
    {
        abort_unless(auth()->user()->can('users.view'), 403, 'No tienes permisos para ver usuarios.');

        return Inertia::render('users/show', [
            'user' => $user->load('branch'),
        ]);
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user)
    {
        abort_unless(auth()->user()->can('users.update'), 403, 'No tienes permisos para editar usuarios.');

        $branches = Branch::where('status', true)->get();

        return Inertia::render('users/edit', [
            'user' => $user->load('branch'),
            'branches' => $branches,
            'roles' => $this->assignableRoles(),
            'currentRoleId' => $this->currentRoleId($user),
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user)
    {
        abort_unless(auth()->user()->can('users.update'), 403, 'No tienes permisos para editar usuarios.');

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'role_id' => ['required', Rule::exists('roles', 'id')->where(fn ($q) => $q->where('tenant_id', app(TenantManager::class)->id()))],
            'branch_id' => [
                'nullable',
                'exists:branches,id',
            ],
            'password' => 'nullable|string|min:8|confirmed',
            'status' => 'sometimes|boolean',
            'photo' => 'nullable|image|max:1024', // 1MB max
        ]);

        // Upload photo to Vercel Blob (persists across deploys, unlike local filesystem)
        if ($request->hasFile('photo')) {
            try {
                // Delete old photo from Blob if it's a Blob URL
                if ($user->photo) {
                    $this->blobStorage->delete($user->photo);
                }
                $validated['photo'] = $this->blobStorage->upload($request->file('photo'), 'users');
            } catch (\Exception $e) {
                \Log::error('Error al actualizar la foto: '.$e->getMessage());
            }
        }

        $role = Role::where('tenant_id', app(TenantManager::class)->id())->findOrFail($validated['role_id']);

        // Update user data
        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            // Legacy string column — approximated for a custom role, see
            // DefaultRoleProvisioner::legacyStringForRole().
            'role' => DefaultRoleProvisioner::legacyStringForRole($role),
            'branch_id' => $validated['branch_id'] ?? null,
            'status' => $validated['status'] ?? $user->status,
        ];

        // Add photo if it was updated
        if (isset($validated['photo'])) {
            $userData['photo'] = $validated['photo'];
        }

        // Add password if it was provided
        if (isset($validated['password'])) {
            $userData['password'] = Hash::make($validated['password']);
        }

        $user->update($userData);

        // syncRoles() (not assignRole()): a user holds exactly one role by
        // design, and this "Rol" field is how an admin changes it — assignRole()
        // would just ADD the new one, leaving the old attached too, and this
        // user would end up with the union of both roles' permissions.
        $user->syncRoles([$role]);

        // Igual que en store(): solo el rol Encargado del sistema dispara el
        // auto-registro como gerente de sucursal.
        $isSystemEncargado = $role->is_system && $role->name === DefaultRoleProvisioner::ENCARGADO;
        if ($isSystemEncargado && isset($validated['branch_id'])) {
            // Si el usuario ya era encargado de otra sucursal, quitarlo como encargado
            Branch::where('manager_id', $user->id)
                ->where('id', '!=', $validated['branch_id'])
                ->update(['manager_id' => null]);

            // Asignar al usuario como encargado de la nueva sucursal
            Branch::where('id', $validated['branch_id'])->update(['manager_id' => $user->id]);
        } else {
            // Si el usuario ha dejado de ser encargado, o sigue siéndolo pero
            // sin sucursal asignada, quitarlo como manager de cualquier sucursal.
            Branch::where('manager_id', $user->id)->update(['manager_id' => null]);
        }

        return redirect()->route('users.show', $user)
            ->with('success', 'Usuario actualizado exitosamente');
    }

    /**
     * Remove the specified user from storage.
     */
    public function destroy(Request $request, User $user)
    {
        abort_unless(auth()->user()->can('users.delete'), 403, 'No tienes permisos para eliminar usuarios.');

        // Prevent self-deletion
        if ($user->id === Auth::id()) {
            return redirect()->back()
                ->with('error', 'No puedes eliminar tu propio usuario');
        }

        // Archive user before soft delete
        ArchivedUser::create([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'branch_id' => $user->branch_id,
            'status' => $user->status,
            'photo' => $user->photo,
            'archived_at' => now(),
            'archive_reason' => $request->reason,
            'archived_by' => Auth::id(),
        ]);

        // Soft delete the user
        $user->delete();

        return redirect()->route('users.index')
            ->with('success', 'Usuario eliminado exitosamente');
    }

    /**
     * Show user-branch relationships in a definitive way.
     * Returns a manager user, the branches they manage, a branch, and its manager.
     */
    public function userBranchRelationships()
    {
        // Get a manager user
        $user = User::where('role', 'encargado')->first();
        // Branches where the user is manager
        $branches = $user ? $user->managedBranches : collect();

        // Get a branch
        $branch = Branch::first();
        // Manager of the branch
        $manager = $branch ? $branch->manager : null;

        return response()->json([
            'manager_user' => $user,
            'branches_managed' => $branches,
            'branch' => $branch,
            'branch_manager' => $manager,
        ]);
    }

    private function currentRoleId(User $user): ?int
    {
        /** @var Role|null $role */
        $role = $user->roles()->first();

        return $role?->id;
    }

    /**
     * Every role the current tenant can assign to a user — the 3 system
     * roles plus whatever custom roles the tenant has created. Role
     * carries NO automatic tenant scope (see app/Models/Role.php), so the
     * explicit tenant_id filter below is required, not defensive extra.
     *
     * @return array<int, array{id: int, name: string, is_system: bool}>
     */
    private function assignableRoles(): array
    {
        return Role::where('tenant_id', app(TenantManager::class)->id())
            ->orderByDesc('is_system')
            ->orderBy('name')
            ->get(['id', 'name', 'is_system', 'data_scope'])
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => $role->is_system,
                'data_scope' => $role->data_scope,
            ])
            ->all();
    }
}
