<?php

namespace App\Http\Controllers\Api\Store;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Liveness + database check for an external uptime monitor. Needs no API
 * key and exposes nothing about any business: only the release, the server
 * time and whether the database answers a trivial query.
 */
class StoreHealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $dbHealthy = true;
        } catch (Throwable) {
            $dbHealthy = false;
        }

        return response()->json([
            'status' => $dbHealthy ? 'ok' : 'error',
            'version' => config('app.version'),
            'time' => now()->toIso8601String(),
            'db' => $dbHealthy ? 'ok' : 'error',
        ], $dbHealthy ? 200 : 503, ['Cache-Control' => 'no-store']);
    }
}
