<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;

beforeEach(function () {
    $this->branchA  = Branch::factory()->create();
    $this->branchB  = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->client   = Client::factory()->create();
    $this->userA    = vendedorUser($this->branchA);

    BusinessSetting::factory()->create(['require_cash_session' => false]);
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->productA = Product::factory()->create([
        'branch_id'   => $this->branchA->id,
        'category_id' => $this->category->id,
        'name'        => 'Producto A',
        'code'        => 'PRODA001',
        'stock'       => 50,
        'tax'         => 0,
        'status'      => true,
    ]);
    $this->productB = Product::factory()->create([
        'branch_id'   => $this->branchB->id,
        'category_id' => $this->category->id,
        'name'        => 'Producto B',
        'code'        => 'PRODB001',
        'stock'       => 50,
        'tax'         => 0,
        'status'      => true,
    ]);
});

describe('Branch Isolation', function () {
    it('user A does not see products from branch B in product list', function () {
        $response = $this->actingAs($this->userA)
            ->get(route('products.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('products.data', 1)
        );
    });

    it('user A does not see sales from branch B', function () {
        $sellerB = vendedorUser($this->branchB);

        Sale::factory()->create([
            'branch_id'      => $this->branchB->id,
            'client_id'      => $this->client->id,
            'seller_id'      => $sellerB->id,
            'status'         => 'completed',
            'payment_method' => 'cash',
            'total'          => 10000,
            'net'            => 10000,
            'date'           => now(),
        ]);

        $response = $this->actingAs($this->userA)
            ->get(route('sales.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('sales.data', 0)
        );
    });

    it('user A gets 403 viewing sale from branch B', function () {
        $sellerB = vendedorUser($this->branchB);

        $saleB = Sale::factory()->create([
            'branch_id'      => $this->branchB->id,
            'client_id'      => $this->client->id,
            'seller_id'      => $sellerB->id,
            'status'         => 'completed',
            'payment_method' => 'cash',
            'total'          => 10000,
            'net'            => 10000,
            'date'           => now(),
        ]);

        $response = $this->actingAs($this->userA)
            ->get(route('sales.show', $saleB));

        $response->assertStatus(403);
    });

    it('product search only returns products from user branch', function () {
        $response = $this->actingAs($this->userA)
            ->getJson(route('api.products.search', ['q' => 'Producto']));

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Producto A']);
        $response->assertJsonMissing(['name' => 'Producto B']);
    });

    it('user A does not see cash sessions from branch B', function () {
        \App\Models\CashSession::factory()->create([
            'branch_id'         => $this->branchB->id,
            'opened_by_user_id' => vendedorUser($this->branchB)->id,
            'status'            => 'open',
        ]);

        $response = $this->actingAs($this->userA)
            ->get(route('cash-sessions.index'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->has('sessions.data', 0)
        );
    });
});
