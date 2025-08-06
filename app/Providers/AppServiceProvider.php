<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\Request;

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
    }
}
