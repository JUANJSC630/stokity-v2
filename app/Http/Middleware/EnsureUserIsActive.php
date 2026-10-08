<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Logging in already rejects an inactive account, but a user who was
 * deactivated afterwards would keep their open session (or remember-me cookie)
 * until it expired. This signs them out on their next request.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null || $user->status) {
            return $next($request);
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->expectsJson()) {
            return response()->json(['message' => 'Tu cuenta está desactivada.'], 401);
        }

        return redirect()->route('login')->withErrors(['email' => 'Tu cuenta está desactivada.']);
    }
}
