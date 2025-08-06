<?php

namespace App\Http\Controllers;

use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class PaymentMethodController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $paymentMethods = PaymentMethod::ordered()->get();

        return Inertia::render('payment-methods/index', [
            'paymentMethods' => $paymentMethods,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('payment-methods/create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:payment_methods,code',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        PaymentMethod::create($validated);

        return redirect()->route('payment-methods.index')
            ->with('success', 'Método de pago creado exitosamente.');
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(PaymentMethod $paymentMethod)
    {
        return Inertia::render('payment-methods/edit', [
            'paymentMethod' => $paymentMethod,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, PaymentMethod $paymentMethod)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => ['required', 'string', 'max:50', Rule::unique('payment_methods', 'code')->ignore($paymentMethod->id)],
            'description' => 'nullable|string',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $paymentMethod->update($validated);

        return redirect()->route('payment-methods.index')
            ->with('success', 'Método de pago actualizado exitosamente.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(PaymentMethod $paymentMethod)
    {
        // Verificar si hay ventas usando este método de pago
        $salesCount = $paymentMethod->sales()->count();
        
        if ($salesCount > 0) {
            return back()->with('error', 'No se puede eliminar este método de pago porque está siendo utilizado en ' . $salesCount . ' venta(s).');
        }

        $paymentMethod->delete();

        return back()->with('success', 'Método de pago eliminado exitosamente.');
    }

    /**
     * Get all active payment methods for API
     */
    public function getActive()
    {
        return response()->json(PaymentMethod::getActive());
    }

    /**
     * Toggle active status
     */
    public function toggleActive(PaymentMethod $paymentMethod)
    {
        $paymentMethod->update([
            'is_active' => !$paymentMethod->is_active
        ]);

        return back()->with('success', 'Estado del método de pago actualizado exitosamente.');
    }
} 