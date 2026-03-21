<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\CashSession;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch   = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->seller   = vendedorUser($this->branch);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash']);
    Client::factory()->create();

    $this->product = Product::factory()->create([
        'branch_id'   => $this->branch->id,
        'category_id' => $this->category->id,
        'name'        => 'Café Test',
        'code'        => 'CAFE001',
        'stock'       => 50,
        'tax'         => 0,
        'status'      => true,
    ]);
});

describe('POS Flow', function () {
    it('GET /pos returns 200 with expected props', function () {
        $response = $this->actingAs($this->seller)
            ->get(route('pos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('pos/index')
            ->has('branches')
            ->has('clients')
            ->has('categories')
            ->has('currentSession')
            ->has('requireCashSession')
        );
    });

    it('product search returns products from user branch', function () {
        $response = $this->actingAs($this->seller)
            ->getJson(route('api.products.search', ['q' => 'Café']));

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Café Test']);
    });

    it('product search does not return products from other branches', function () {
        $otherBranch = Branch::factory()->create();
        Product::factory()->create([
            'branch_id'   => $otherBranch->id,
            'category_id' => $this->category->id,
            'name'        => 'Café Otro',
            'code'        => 'CAFE002',
            'status'      => true,
        ]);

        $response = $this->actingAs($this->seller)
            ->getJson(route('api.products.search', ['q' => 'Café']));

        $response->assertOk();
        $response->assertJsonMissing(['name' => 'Café Otro']);
    });

    it('product search includes rate limit header', function () {
        $response = $this->actingAs($this->seller)
            ->getJson(route('api.products.search', ['q' => 'test']));

        $response->assertOk();
        $response->assertHeader('X-RateLimit-Limit');
    });

    it('POS shows require_cash_session info when enabled', function () {
        BusinessSetting::first()->update(['require_cash_session' => true]);

        $response = $this->actingAs($this->seller)
            ->get(route('pos.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('requireCashSession', true)
            ->where('currentSession', null)
        );
    });
});
