<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('settings/business', [
            'business' => BusinessSetting::getSettings(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'nit'             => 'nullable|string|max:50',
            'phone'           => 'nullable|string|max:30',
            'email'           => 'nullable|email|max:100',
            'address'         => 'nullable|string|max:255',
            'currency_symbol' => 'nullable|string|max:5',
            'logo'            => 'nullable|image|max:2048',
        ]);

        $settings = BusinessSetting::getSettings();

        if ($request->hasFile('logo')) {
            $uploadPath = public_path('uploads/business');

            if (!is_dir($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }

            if ($settings->logo && file_exists($uploadPath . '/' . $settings->logo)) {
                unlink($uploadPath . '/' . $settings->logo);
            }

            $file = $request->file('logo');
            $filename = 'logo.' . $file->getClientOriginalExtension();
            $file->move($uploadPath, $filename);
            $validated['logo'] = $filename;
        }

        $settings->update($validated);

        return redirect()->back()->with('success', 'Configuración del negocio actualizada.');
    }
}
