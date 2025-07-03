<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BranchRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'address' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'status' => ['boolean'],
            'manager_id' => ['nullable', function ($attribute, $value, $fail) {
                if ($value !== null && !app(\App\Models\User::class)->where('id', $value)->exists()) {
                    $fail('El gerente seleccionado no existe.');
                }
            }],
        ];
    }
    
    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // Convert empty string or 'none' manager_id to null
        if (empty($this->manager_id) || $this->manager_id === 'none') {
            $this->merge(['manager_id' => null]);
        }
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'El nombre de la sucursal es obligatorio.',
            'name.max' => 'El nombre de la sucursal no puede superar los 255 caracteres.',
            'address.required' => 'La dirección de la sucursal es obligatoria.',
            'address.max' => 'La dirección de la sucursal no puede superar los 255 caracteres.',
            'phone.required' => 'El teléfono de la sucursal es obligatorio.',
            'phone.max' => 'El teléfono de la sucursal no puede superar los 20 caracteres.',
            'email.email' => 'El correo electrónico debe ser una dirección de correo válida.',
            'email.max' => 'El correo electrónico no puede superar los 255 caracteres.',
            'manager_id.exists' => 'El gerente seleccionado no existe.',
        ];
    }
}
