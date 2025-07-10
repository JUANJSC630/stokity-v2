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
            // El manager_id ahora se maneja exclusivamente desde UserController
        ];
    }
    
    /**
     * Prepare the data for validation.
     *
     * @return void
     */
    protected function prepareForValidation()
    {
        // Ya no necesitamos procesar el manager_id aquí
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
        ];
    }
}
