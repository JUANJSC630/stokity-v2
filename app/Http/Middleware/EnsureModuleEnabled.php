<?php

namespace App\Http\Middleware;

use App\Models\BusinessSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Blocks a route group for a business that has turned the module off from
 * /settings/modules — independent of and in addition to any `can:`
 * permission gate on the same group (Bloque 8's composition rule: a route
 * needs the module ON *and* the permission). Usage: `module:credits`.
 */
class EnsureModuleEnabled
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $module): Response
    {
        abort_unless(BusinessSetting::moduleEnabled($module), 404);

        return $next($request);
    }
}
