<?php

use App\Models\BusinessSetting;
use App\Models\Tenant;
use App\Models\User;
use App\Tenancy\TenantManager;

const LOGO_HOST = 'https://abc123.public.blob.vercel-storage.com';

beforeEach(function () {
    config(['services.vercel_blob.token' => 'test-token-not-real']);

    $this->tenantA = Tenant::create(['name' => 'A', 'slug' => 'tenant-a', 'status' => 'active']);
    $this->tenantB = Tenant::create(['name' => 'B', 'slug' => 'tenant-b', 'status' => 'active']);

    $this->settings = app(TenantManager::class)->runAs($this->tenantA, function () {
        $this->admin = User::factory()->create(['role' => 'administrador', 'status' => true]);

        return BusinessSetting::factory()->create(['logo' => LOGO_HOST."/stokity/t{$this->tenantA->id}/settings/current.webp"]);
    });

    $this->payload = fn (string $logoUrl) => [
        'name' => 'Mi negocio',
        'logo_url' => $logoUrl,
    ];
});

afterEach(fn () => app(TenantManager::class)->forget());

describe('settings.business.update logo_url', function () {
    it('rejects a logo url that points at another tenant blob', function () {
        $foreign = LOGO_HOST."/stokity/t{$this->tenantB->id}/settings/secret.webp";

        $this->actingAs($this->admin)
            ->post(route('settings.business.update'), ($this->payload)($foreign))
            ->assertSessionHasErrors('logo_url');

        expect($this->settings->fresh()->logo)->toBe(LOGO_HOST."/stokity/t{$this->tenantA->id}/settings/current.webp");
    });

    it('rejects an arbitrary external url', function () {
        $this->actingAs($this->admin)
            ->post(route('settings.business.update'), ($this->payload)('https://evil.example/x.png'))
            ->assertSessionHasErrors('logo_url');
    });

    it('accepts the logo that is already saved', function () {
        $current = $this->settings->logo;

        $this->actingAs($this->admin)
            ->post(route('settings.business.update'), ($this->payload)($current))
            ->assertSessionHasNoErrors();

        expect($this->settings->fresh()->logo)->toBe($current);
    });

    it('accepts another blob that belongs to the same tenant', function () {
        $own = LOGO_HOST."/stokity/t{$this->tenantA->id}/settings/other.webp";

        $this->actingAs($this->admin)
            ->post(route('settings.business.update'), ($this->payload)($own))
            ->assertSessionHasNoErrors();

        expect($this->settings->fresh()->logo)->toBe($own);
    });

    it('keeps a legacy external logo working when the form sends it back unchanged', function () {
        $this->settings->forceFill(['logo' => 'https://legacy.example/logo.png'])->save();

        $this->actingAs($this->admin)
            ->post(route('settings.business.update'), ($this->payload)('https://legacy.example/logo.png'))
            ->assertSessionHasNoErrors();

        expect($this->settings->fresh()->logo)->toBe('https://legacy.example/logo.png');
    });
});
