<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOrManagerMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->user() || (!$request->user()->isAdmin() && !$request->user()->isManager())) {
            if ($request->expectsJson()) {
                return response()->json(['error' => 'Unauthorized. Admin or Manager access required.'], 403);
            }
            
            return redirect()->route('dashboard')->with('error', 'No tienes permisos para acceder a esta sección.');
        }
        
        return $next($request);
    }
}
