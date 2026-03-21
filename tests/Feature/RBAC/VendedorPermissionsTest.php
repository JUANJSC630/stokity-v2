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
    // UserController uses abort(403) directly
    it('cannot access GET /users', function () {
        $response = $this->actingAs($this->vendedor)
            ->get(route('users.index'));

        $response->assertStatus(403);
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
});
