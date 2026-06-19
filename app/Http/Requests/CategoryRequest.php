<?php

namespace App\Http\Requests;

use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization will be handled by the middleware
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:500'],
            'status' => ['boolean'],
        ];

        // Category names are unique per tenant.
        $perTenant = fn ($q) => $q->where('tenant_id', app(TenantManager::class)->id());

        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $categoryId = $this->route('category')->id;
            $rules['name'][] = Rule::unique('categories', 'name')->ignore($categoryId)->where($perTenant);
        } else {
            $rules['name'][] = Rule::unique('categories', 'name')->where($perTenant);
        }

        return $rules;
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'El nombre de la categoría es obligatorio.',
            'name.unique' => 'El nombre de la categoría ya está en uso.',
            'name.max' => 'El nombre de la categoría no puede exceder los 100 caracteres.',
            'description.max' => 'La descripción no puede exceder los 500 caracteres.',
        ];
    }
}
