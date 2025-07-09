<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        // Log para depuración
        \Log::info('ProfileController@update - Request data:', [
            'has_file' => $request->hasFile('photo'),
            'all' => $request->all(),
            'files' => $request->allFiles(),
        ]);

        $user = $request->user();
        $validated = $request->validated();
        
        // Procesar la foto si se ha subido una nueva
        if ($request->hasFile('photo')) {
            // Eliminar la foto anterior si existe
            if ($user->photo && file_exists(public_path('uploads/users/' . $user->photo))) {
                unlink(public_path('uploads/users/' . $user->photo));
            }
            
            // Guardar la nueva foto
            $photo = $request->file('photo');
            $filename = time() . '_' . $user->id . '.' . $photo->getClientOriginalExtension();
            
            // Asegurar que el directorio existe
            if (!file_exists(public_path('uploads/users'))) {
                mkdir(public_path('uploads/users'), 0755, true);
            }
            
            // Mover el archivo al directorio público
            $photo->move(public_path('uploads/users'), $filename);
            
            // Actualizar el nombre de la foto en el modelo
            $validated['photo'] = $filename;
        } else {
            // Si no se sube una nueva foto, mantener la anterior
            unset($validated['photo']);
        }
        
        // Actualizar los datos del usuario
        $user->fill($validated);
        
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }
        
        $user->save();
        
        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
