<?php

namespace App\Providers;

use App\Tenancy\TenantManager;
use Illuminate\Support\ServiceProvider;

class TenancyServiceProvider extends ServiceProvider
{
    /**
     * Register tenancy services.
     */
    public function register(): void
    {
        // One TenantManager per request/process, shared across the container so
        // the global scope, the trait and the middleware all read the same state.
        $this->app->singleton(TenantManager::class);
    }

    public function boot(): void
    {
        //
    }
}
