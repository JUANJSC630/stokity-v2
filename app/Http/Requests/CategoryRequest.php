<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

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

        // If this is an update request, add a unique rule that excludes the current category
        if ($this->isMethod('PUT') || $this->isMethod('PATCH')) {
            $categoryId = $this->route('category')->id;
            $rules['name'][] = "unique:categories,name,{$categoryId}";
        } else {
            $rules['name'][] = 'unique:categories,name';
        }

        return $rules;
    }
    
    /**
     * Get custom messages for validator errors.
     *
     * @return array
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
