<?php

namespace App\Http\Requests;

use App\Models\ProductTag;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductTagRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('products.update');
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:'.ProductTag::NAME_MAX_LENGTH,
                Rule::unique('product_tags', 'name')
                    ->ignore($this->route('product_tag')?->id)
                    ->where(fn ($query) => $query->where('tenant_id', app(TenantManager::class)->id())),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['name' => 'nombre'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.unique' => 'Ya existe una etiqueta con ese nombre.',
            'name.max' => 'El nombre no puede tener más de '.ProductTag::NAME_MAX_LENGTH.' caracteres.',
        ];
    }
}
