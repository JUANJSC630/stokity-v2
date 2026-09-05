<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Same field rules as App\Http\Requests\RoleRequest, but for a role owned by
 * an arbitrary tenant (the {tenant} route param) rather than the current
 * tenant context — the super admin has no Spatie role/permissions of their
 * own, so authorize() can't check settings.roles.manage like the tenant-
 * facing request does; the `super_admin` route middleware already gates this.
 */
class TenantRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\Tenant $tenant */
        $tenant = $this->route('tenant');
        /** @var \App\Models\Role|null $role */
        $role = $this->route('role');

        $perTenant = fn ($q) => $q->where('tenant_id', $tenant->id);

        $nameRule = Rule::unique('roles', 'name')->where($perTenant);
        if ($role) {
            $nameRule = $nameRule->ignore($role->id);
        }

        return [
            'name' => ['required', 'string', 'max:100', $nameRule],
            'description' => ['nullable', 'string', 'max:255'],
            'data_scope' => ['required', 'string', Rule::in(['all', 'branch'])],
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::in(PermissionCatalog::names())],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del rol es obligatorio.',
            'name.unique' => 'Ya existe un rol con ese nombre en este negocio.',
            'name.max' => 'El nombre no puede superar los 100 caracteres.',
            'data_scope.required' => 'Selecciona el alcance de datos del rol.',
            'permissions.*.in' => 'Uno de los permisos seleccionados no es válido.',
        ];
    }
}
