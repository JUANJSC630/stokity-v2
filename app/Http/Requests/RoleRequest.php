<?php

namespace App\Http\Requests;

use App\Authorization\PermissionCatalog;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('settings.roles.manage');
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var \App\Models\Role|null $role */
        $role = $this->route('role');

        $perTenant = fn ($q) => $q->where('tenant_id', app(TenantManager::class)->id());

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
            'name.unique' => 'Ya existe un rol con ese nombre.',
            'name.max' => 'El nombre no puede superar los 100 caracteres.',
            'data_scope.required' => 'Selecciona el alcance de datos del rol.',
            'permissions.*.in' => 'Uno de los permisos seleccionados no es válido.',
        ];
    }
}
