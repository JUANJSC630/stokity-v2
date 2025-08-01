<?php

namespace App\Http\Controllers;

use App\Models\ArchivedUser;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para ver usuarios.');
        }

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
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para crear usuarios.');
        }

        $branches = Branch::where('status', true)->get();

        return Inertia::render('users/create', [
            'branches' => $branches,
            'roles' => ['administrador', 'encargado', 'vendedor'],
        ]);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para crear usuarios.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|in:administrador,encargado,vendedor',
            'branch_id' => [
                Rule::requiredIf(fn() => $request->role !== 'administrador'),
                'nullable',
                'exists:branches,id',
            ],
            'password' => 'required|string|min:8|confirmed',
            'status' => 'sometimes|boolean',
            'photo' => 'nullable|image|max:1024', // 1MB max
        ]);

        // Handle photo upload if present
        if ($request->hasFile('photo')) {
            try {
                $uploadPath = public_path('uploads/users');

                // Asegurarse de que el directorio existe
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }

                $file = $request->file('photo');
                $extension = $file->getClientOriginalExtension();
                $filename = time() . '_' . pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '.' . $extension;

                // Subir la imagen
                $file->move($uploadPath, $filename);

                // Verificar que se subió correctamente
                if (file_exists($uploadPath . '/' . $filename)) {
                    $validated['photo'] = $filename;

                    // Log para depuración
                    \Log::info('Foto subida exitosamente:', [
                        'filename' => $filename,
                        'path' => $uploadPath,
                        'full_path' => $uploadPath . '/' . $filename,
                        'url' => asset('uploads/users/' . $filename)
                    ]);
                } else {
                    \Log::error('Error: No se pudo verificar la existencia del archivo subido:', [
                        'filename' => $filename,
                        'path' => $uploadPath
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Error al subir la foto: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }

        // Create user
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'branch_id' => $validated['branch_id'] ?? null,
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'] ?? true,
            'photo' => $validated['photo'] ?? null,
        ]);

        // Si el usuario es encargado y se le asigna una sucursal, actualizar el manager_id de la sucursal
        if ($validated['role'] === 'encargado' && isset($validated['branch_id'])) {
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
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para ver usuarios.');
        }

        return Inertia::render('users/show', [
            'user' => $user->load('branch'),
        ]);
    }

    /**
     * Show the form for editing the specified user.
     */
    public function edit(User $user)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para editar usuarios.');
        }

        $branches = Branch::where('status', true)->get();

        return Inertia::render('users/edit', [
            'user' => $user->load('branch'),
            'branches' => $branches,
            'roles' => ['administrador', 'encargado', 'vendedor'],
        ]);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, User $user)
    {
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para editar usuarios.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'role' => 'required|in:administrador,encargado,vendedor',
            'branch_id' => [
                Rule::requiredIf(fn() => $request->role !== 'administrador'),
                'nullable',
                'exists:branches,id',
            ],
            'password' => 'nullable|string|min:8|confirmed',
            'status' => 'sometimes|boolean',
            'photo' => 'nullable|image|max:1024', // 1MB max
        ]);

        // Handle photo upload if present
        if ($request->hasFile('photo')) {
            try {
                $uploadPath = public_path('uploads/users');

                // Asegurarse de que el directorio existe
                if (!file_exists($uploadPath)) {
                    mkdir($uploadPath, 0755, true);
                }

                // Delete old photo if exists
                if ($user->photo && file_exists($uploadPath . '/' . $user->photo)) {
                    unlink($uploadPath . '/' . $user->photo);
                }

                $file = $request->file('photo');
                $extension = $file->getClientOriginalExtension();
                $filename = time() . '_' . pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME) . '.' . $extension;

                // Subir la imagen
                $file->move($uploadPath, $filename);

                // Verificar que se subió correctamente
                if (file_exists($uploadPath . '/' . $filename)) {
                    $validated['photo'] = $filename;

                    // Log para depuración
                    \Log::info('Foto actualizada exitosamente:', [
                        'filename' => $filename,
                        'path' => $uploadPath,
                        'full_path' => $uploadPath . '/' . $filename,
                        'url' => asset('uploads/users/' . $filename),
                        'user_id' => $user->id
                    ]);
                } else {
                    \Log::error('Error: No se pudo verificar la existencia del archivo actualizado:', [
                        'filename' => $filename,
                        'path' => $uploadPath,
                        'user_id' => $user->id
                    ]);
                }
            } catch (\Exception $e) {
                \Log::error('Error al actualizar la foto: ' . $e->getMessage(), [
                    'trace' => $e->getTraceAsString(),
                    'user_id' => $user->id
                ]);
            }
        }

        // Update user data
        $userData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'role' => $validated['role'],
            'branch_id' => $validated['role'] === 'administrador' ? null : $validated['branch_id'],
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

        // Si el usuario es encargado y se le asigna una sucursal, actualizar el manager_id de la sucursal
        if ($validated['role'] === 'encargado' && isset($validated['branch_id'])) {
            // Si el usuario ya era encargado de otra sucursal, quitarlo como encargado
            Branch::where('manager_id', $user->id)
                ->where('id', '!=', $validated['branch_id'])
                ->update(['manager_id' => null]);

            // Asignar al usuario como encargado de la nueva sucursal
            Branch::where('id', $validated['branch_id'])->update(['manager_id' => $user->id]);
        } elseif ($validated['role'] !== 'encargado') {
            // Si el usuario ha dejado de ser encargado, quitarlo como manager de cualquier sucursal
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
        // Verificar que el usuario sea administrador
        if (!auth()->user()->isAdmin()) {
            abort(403, 'No tienes permisos para eliminar usuarios.');
        }

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
}
