<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->vendedor = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);
});

describe('Vendedor — Allowed Routes', function () {
    it('can access GET /pos', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('pos.index'));

        $response->assertOk();
    });

    it('can access GET /sales', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('sales.index'));

        $response->assertOk();
    });

    it('can access GET /cash-sessions/current', function () {
        $response = $this->actingAs($this->vendedor)
            ->getJson(route('cash-sessions.current'));

        $response->assertOk();
    });

    it('can POST /cash-sessions', function () {
        $response = $this->actingAs($this->vendedor)
            ->post(route('cash-sessions.store'), [
                'opening_amount' => 50000,
            ]);

        $response->assertRedirect();
    });
});

describe('Vendedor — Forbidden Routes', function () {
    // AdminMiddleware ahora protege la ruta (el abort(403) del controlador
    // sigue como segunda barrera para llamadas JSON).
    it('cannot access GET /users', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('users.index'));

        $response->assertRedirect(route('dashboard'));
    });

    // AdminMiddleware redirects to dashboard for non-JSON requests
    it('cannot access GET /branches', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('branches.index'));

        $response->assertRedirect(route('dashboard'));
    });

    // AdminOrManagerMiddleware redirects to dashboard for non-JSON requests
    it('cannot POST /products', function () {
        $response = $this->actingAs($this->vendedor)
            ->post(route('products.store'), [
                'name' => 'Test',
                'code' => '99999999',
                'purchase_price' => 5000,
                'sale_price' => 10000,
                'tax' => 0,
                'stock' => 10,
                'min_stock' => 1,
                'category_id' => $this->category->id,
                'branch_id' => $this->branch->id,
            ]);

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot PUT /products/{id}', function () {
        $product = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->vendedor)
            ->put(route('products.update', $product), [
                'name' => 'Updated',
                'code' => $product->code,
                'purchase_price' => 5000,
                'sale_price' => 10000,
                'tax' => 0,
                'min_stock' => 1,
                'category_id' => $this->category->id,
                'branch_id' => $this->branch->id,
            ]);

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot DELETE /products/{id}', function () {
        $product = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
        ]);

        $response = $this->actingAs($this->vendedor)
            ->delete(route('products.destroy', $product));

        $response->assertRedirect(route('dashboard'));
    });

    // AdminMiddleware redirects to dashboard
    it('cannot access GET /settings/business', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('settings.business'));

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot access GET /reports', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('reports.index'));

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot export a report', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('reports.sales-detail.export.pdf'));

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot access GET /suppliers', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('suppliers.index'));

        $response->assertRedirect(route('dashboard'));
    });

    it('cannot POST /suppliers', function () {
        $response = $this->actingAs($this->vendedor)
            ->post(route('suppliers.store'), [
                'name' => 'Proveedor Test',
                'branch_id' => $this->branch->id,
            ]);

        $response->assertRedirect(route('dashboard'));
        expect(\App\Models\Supplier::count())->toBe(0);
    });

    it('cannot access GET /stock-movements', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('stock-movements.index'));

        $response->assertRedirect(route('dashboard'));
    });
});

describe('Vendedor — Cuenta propia', function () {
    it('can access GET /settings/profile', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('profile.edit'));

        $response->assertOk();
    });

    it('can access GET /settings/password', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('password.edit'));

        $response->assertOk();
    });

    it('can change its own password', function () {
        $response = $this->actingAs($this->vendedor)
            ->from(route('password.edit'))
            ->put(route('password.update'), [
                'current_password' => 'password',
                'password' => 'nueva-clave-123',
                'password_confirmation' => 'nueva-clave-123',
            ]);

        $response->assertRedirect(route('password.edit'));
        expect(\Illuminate\Support\Facades\Hash::check('nueva-clave-123', $this->vendedor->fresh()->password))->toBeTrue();
    });

    it('can access GET /settings/appearance', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('appearance'));

        $response->assertOk();
    });

    it('still cannot change the business brand colors', function () {
        $response = $this->actingAs($this->vendedor)
            ->post(route('appearance.brand-colors'), [
                'brand_color' => '#000000',
                'brand_color_secondary' => '#ffffff',
            ]);

        $response->assertRedirect(route('dashboard'));
    });
});
