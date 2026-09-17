<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            // Force HTTPS scheme for all URLs
            URL::forceScheme('https');

            // Trust all proxies for Railway deployment
            Request::setTrustedProxies(['*'],
                Request::HEADER_X_FORWARDED_FOR |
                Request::HEADER_X_FORWARDED_HOST |
                Request::HEADER_X_FORWARDED_PORT |
                Request::HEADER_X_FORWARDED_PROTO |
                Request::HEADER_X_FORWARDED_AWS_ELB
            );

            // Force root URL to be HTTPS
            if (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https') {
                URL::forceRootUrl(config('app.url'));
            }
        }

        // Public storefront API (routes/api.php). Keyed by the bearer API
        // key itself, not IP and NOT via TenantManager. Keying by IP (the
        // plain `throttle:60,1` used elsewhere in this app) would be wrong
        // here: a storefront that fetches this API server-side (the
        // recommended integration — see ECOMMERCE_API_PLAN.md) makes every
        // one of its visitors share a single IP, so one busy tenant's
        // traffic would throttle itself long before 60 req/min per real
        // visitor. Keying via `app(TenantManager::class)->id()` was tried
        // and is ALSO wrong, for a subtler reason: Laravel's hardcoded
        // `Kernel::$middlewarePriority` runs ThrottleRequests before any
        // unprioritized custom middleware regardless of the order declared
        // on the route, so this closure would run before
        // ResolveTenantFromApiKey ever sets the tenant — reading whatever
        // tenant the *previous* request left behind, silently mixing two
        // tenants' rate-limit buckets. Hashing the token directly needs no
        // ordering guarantee at all: it's available straight off the
        // request, and one key maps to exactly one tenant anyway.
        RateLimiter::for('store-api', function (Request $request) {
            $token = $request->bearerToken();

            return Limit::perMinute(60)->by($token ? hash('sha256', $token) : $request->ip());
        });
    }
}
