<?php

namespace App\Providers;

use App\Models\TenantApiKey;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
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
        $this->app->singleton(\App\Models\BusinessSetting::MEMO_BINDING, fn () => new \ArrayObject);

        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Event::listen(DiagnosingHealth::class, fn () => DB::select('select 1'));

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
        //
        // Three independent buckets per key — read (GET), write (PATCH /
        // images) and orders (POST order-reference) — so a storefront
        // exhausting its read budget on a cold cache can never starve the
        // order-reference call. Each bucket uses the key's own
        // `rate_limit_per_minute` (null = 60). The key row is looked up by
        // hash here for the same reason the token is hashed directly: this
        // closure runs before ResolveTenantFromApiKey. An unknown/revoked
        // token falls back to the IP and the default limit, so garbage
        // tokens can't mint their own buckets.
        foreach (['read', 'write', 'orders'] as $bucket) {
            RateLimiter::for("store-api-{$bucket}", function (Request $request) use ($bucket) {
                $token = $request->bearerToken();
                $apiKey = $token ? TenantApiKey::findActiveByPlainKey($token) : null;

                return Limit::perMinute($apiKey?->effectiveRateLimitPerMinute() ?? TenantApiKey::DEFAULT_RATE_LIMIT_PER_MINUTE)
                    ->by($apiKey ? $bucket.':'.$apiKey->hashed_key : $bucket.':ip:'.$request->ip());
            });
        }
    }
}
