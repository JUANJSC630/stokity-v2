<?php

namespace App\Http\Controllers\Settings;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;
use App\Http\Controllers\Controller;
use App\Models\Product;

class AppearanceController extends Controller
{
    public function updateDefaultProductImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,gif|max:2048',
        ]);

        // Guardar la imagen en public/uploads/default-product.png
        $file = $request->file('image');
        $filename = 'default-product.png';
        $path = public_path('uploads/' . $filename);

        // Eliminar la anterior si existe
        if (File::exists($path)) {
            File::delete($path);
        }
        $file->move(public_path('uploads'), $filename);

        // Actualizar productos que usan la imagen por defecto
        $defaultIcon = 'stokity-icon.png';
        $products = Product::where(function($q) use ($defaultIcon) {
            $q->whereNull('image')
              ->orWhere('image', $defaultIcon)
              ->orWhere('image', 'default-product.png');
        })->get();
        foreach ($products as $product) {
            $product->image = 'default-product.png';
            $product->save();
        }

        return redirect()->back()->with('success', 'Imagen por defecto actualizada correctamente.');
    }
}
