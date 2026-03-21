<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch   = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->user     = vendedorUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    Product::factory()->create([
        'branch_id'   => $this->branch->id,
        'category_id' => $this->category->id,
        'name'        => 'Café Premium',
        'code'        => 'CAFE100',
        'status'      => true,
    ]);
});

describe('Product Search', function () {
    it('returns matches by name', function () {
        $response = $this->actingAs($this->user)
            ->getJson(route('api.products.search', ['q' => 'Café']));

        $response->assertOk();
        $response->assertJsonFragment(['name' => 'Café Premium']);
    });

    it('returns matches by code', function () {
        $response = $this->actingAs($this->user)
            ->getJson(route('api.products.search', ['q' => 'CAFE100']));

        $response->assertOk();
        $response->assertJsonFragment(['code' => 'CAFE100']);
    });

    it('only returns products from user branch', function () {
        $otherBranch = Branch::factory()->create();
        Product::factory()->create([
            'branch_id'   => $otherBranch->id,
            'category_id' => $this->category->id,
            'name'        => 'Café Remoto',
            'code'        => 'CAFE200',
            'status'      => true,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('api.products.search', ['q' => 'Café']));

        $response->assertJsonFragment(['name' => 'Café Premium']);
        $response->assertJsonMissing(['name' => 'Café Remoto']);
    });

    it('only returns active products', function () {
        Product::factory()->create([
            'branch_id'   => $this->branch->id,
            'category_id' => $this->category->id,
            'name'        => 'Café Inactivo',
            'code'        => 'CAFE300',
            'status'      => false,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson(route('api.products.search', ['q' => 'Café']));

        $response->assertJsonMissing(['name' => 'Café Inactivo']);
    });

    it('rate limit header is present', function () {
        $response = $this->actingAs($this->user)
            ->getJson(route('api.products.search', ['q' => 'test']));

        $response->assertHeader('X-RateLimit-Limit');
    });
});
