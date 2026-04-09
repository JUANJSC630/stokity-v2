<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use App\Services\BlobStorageService;
use Illuminate\Http\Request;

class AppearanceController extends Controller
{
    public function __construct(private BlobStorageService $blob) {}

    public function updateBrandColors(Request $request)
    {
        $request->validate([
            'brand_color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'brand_color_secondary' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ]);

        BusinessSetting::getSettings()->update($request->only('brand_color', 'brand_color_secondary'));

        return redirect()->back()->with('success', 'Colores actualizados.');
    }

    public function updateDefaultProductImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|max:2048',
        ]);

        $settings = BusinessSetting::getSettings();

        // Delete old blob if it exists
        if ($settings->default_product_image) {
            $this->blob->delete($settings->default_product_image);
        }

        $url = $this->blob->upload($request->file('image'), 'settings');

        $settings->update(['default_product_image' => $url]);

        return redirect()->back()->with('success', 'Imagen por defecto actualizada correctamente.');
    }
}
