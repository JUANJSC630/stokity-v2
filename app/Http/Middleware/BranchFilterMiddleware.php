<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class BranchFilterMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();
        
        // Si el usuario no es administrador y tiene una sucursal asignada
        if ($user && !$user->isAdmin() && $user->branch_id) {
            // Agregar el branch_id del usuario a la request para que los controladores lo usen
            $request->merge(['user_branch_id' => $user->branch_id]);
            
            // También agregar una variable global para usar en las vistas
            view()->share('userBranchId', $user->branch_id);
        }
        
        return $next($request);
    }
} 