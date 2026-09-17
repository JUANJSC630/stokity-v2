<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    // Scoped to the public storefront API only (see routes/api.php) — never
    // the panel's own /api/products/search or /api/payment-methods/active,
    // which run under the `web` group with a session and must stay
    // same-origin. No Sanctum stateful auth here, so 'sanctum/csrf-cookie'
    // is deliberately not included.
    'paths' => ['api/v1/store/*'],

    // Read-only surface today (Fase 1 of ECOMMERCE_API_PLAN.md). Add 'POST'
    // here only alongside a real Fase 2 write endpoint, never preemptively.
    'allowed_methods' => ['GET', 'HEAD', 'OPTIONS'],

    // Safe as '*' specifically because auth here is a Bearer API key header
    // (ResolveTenantFromApiKey), never a cookie — with
    // supports_credentials=false below, the browser never attaches this
    // tenant's session/cookies to a cross-origin call anyway, so CORS isn't
    // the security boundary for this API; the API key is. What actually
    // protects a tenant's data is that key staying server-side in the
    // storefront's own backend, never shipped into its browser bundle.
    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Authorization', 'Accept', 'Content-Type'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
