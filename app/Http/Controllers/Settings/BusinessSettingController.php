<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Services\BlobStorageService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BusinessSettingController extends Controller
{
    public function __construct(private BlobStorageService $blob) {}

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
            'logo'                 => 'nullable|image|max:4096',
            'logo_url'             => 'nullable|url|max:500',
            'require_cash_session' => 'nullable|boolean',
        ]);

        $settings = BusinessSetting::getSettings();

        if ($request->hasFile('logo')) {
            // New file upload — delete old blob and upload the new one.
            if ($settings->logo && str_starts_with($settings->logo, 'http')) {
                $this->blob->delete($settings->logo);
            }
            $validated['logo'] = $this->blob->upload($request->file('logo'), 'settings');
        } elseif (!empty($validated['logo_url'])) {
            // URL provided directly (e.g. an existing blob URL) — save as-is,
            // no new upload needed.
            $validated['logo'] = $validated['logo_url'];
        } else {
            // Neither file nor URL — keep the existing logo unchanged.
            unset($validated['logo']);
        }

        unset($validated['logo_url']);
        $settings->update($validated);

        return redirect()->back()->with('success', 'Configuración del negocio actualizada.');
    }
}
