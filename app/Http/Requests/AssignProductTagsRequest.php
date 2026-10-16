<?php

namespace App\Http\Requests;

use App\Rules\TenantExists;
use Illuminate\Foundation\Http\FormRequest;

class AssignProductTagsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('products.update');
    }

    /**
     * @return array<string, array<int, mixed>|string>
     */
    public function rules(): array
    {
        return [
            'product_ids' => ['required', 'array', 'min:1', 'max:200'],
            'product_ids.*' => ['integer', 'distinct', TenantExists::in('products')],
            'tag_id' => ['required', 'integer', TenantExists::in('product_tags')],
            'action' => ['required', 'in:add,remove'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'product_ids.required' => 'Selecciona al menos un producto.',
            'product_ids.max' => 'Puedes etiquetar hasta 200 productos a la vez.',
            'tag_id.required' => 'Elige una etiqueta.',
        ];
    }
}
