<?php

namespace App\Http\Middleware;

use App\Models\BusinessSetting;
use App\Models\Tenant;
use App\Tenancy\TenantManager;
use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;
use Tighten\Ziggy\Ziggy;

class HandleInertiaRequests extends Middleware
{
    public function __construct(private TenantManager $tenants) {}

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'business' => fn () => $this->resolveBusinessSettings($request),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user' => $request->user(),
                // Empty for guests and for the platform super-admin (who has
                // no tenant context/roles — see IdentifyTenant) — the
                // frontend's isSuperAdmin branch never consults this array.
                'permissions' => fn () => $request->user()?->allPermissionNames() ?? [],
            ],
            'ziggy' => fn (): array => [
                ...(new Ziggy)->toArray(),
                'location' => $request->url(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'last_sale_id' => fn () => $request->session()->get('last_sale_id'),
                'last_sale_code' => fn () => $request->session()->get('last_sale_code'),
                'temporaryPassword' => fn () => $request->session()->get('temporaryPassword'),
            ],
        ];
    }

    /**
     * Business branding (name/logo/colors) shown on welcome.tsx and the
     * auth pages. Inside an active tenant, this is just
     * BusinessSetting::getSettings() as always.
     *
     * On a true guest request (not logged in — this app has no subdomain
     * routing, so a visitor's tenant is otherwise unknowable pre-login),
     * fall back to the `last_tenant` cookie set on successful login
     * (AuthenticatedSessionController::store()) to recognize a returning
     * device and show that business's branding instead of the generic
     * Stokity default.
     *
     * Checks `$request->user()` in addition to `TenantManager::check()` —
     * redundant against IdentifyTenant's current behavior (it only ever
     * sets a tenant for an authenticated, non-super-admin user, so
     * `check() === true` already implies a user is present), but kept as
     * an explicit belt-and-suspenders: a logged-in super-admin also has no
     * tenant context (their /admin panel is platform-wide), and this line
     * is the only thing standing between that panel and a stale cookie
     * leaking a specific tenant's branding into it, so it stays explicit
     * rather than relying on IdentifyTenant never changing.
     */
    private function resolveBusinessSettings(Request $request): BusinessSetting
    {
        if ($this->tenants->check() || $request->user()) {
            return BusinessSetting::getSettings();
        }

        $tenant = $this->recognizedTenant($request);

        if (! $tenant) {
            return BusinessSetting::getSettings();
        }

        // Read-only: an anonymous page load must never provision a
        // BusinessSetting row on a tenant's behalf.
        return $this->tenants->runAs($tenant, fn () => BusinessSetting::getSettingsReadOnly());
    }

    /**
     * The active tenant named by the `last_tenant` cookie, or null if
     * there isn't one / it doesn't resolve to a real, active tenant.
     * Cached briefly (a slug lookup on every guest page load otherwise),
     * with a short TTL so a newly suspended tenant stops showing its
     * branding within a minute rather than staying cached for the full
     * hour BusinessSetting itself uses.
     */
    private function recognizedTenant(Request $request): ?Tenant
    {
        $slug = $request->cookie('last_tenant');

        if (! $slug) {
            return null;
        }

        $tenant = Cache::remember("last_tenant_cookie:{$slug}", 60, fn () => Tenant::where('slug', $slug)->first());

        return $tenant?->isActive() ? $tenant : null;
    }
}
