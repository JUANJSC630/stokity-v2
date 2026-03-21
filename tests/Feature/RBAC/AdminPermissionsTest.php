<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;

beforeEach(function () {
    $this->branch   = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->admin    = adminUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);
});

describe('Admin — Allowed Routes', function () {
    it('can access GET /users', function () {
        $response = $this->actingAs($this->admin)
            ->get(route('users.index'));

        $response->assertOk();
    });

    it('can POST /products and create product', function () {
        $this->mock(\App\Services\BlobStorageService::class, function ($mock) {
            $mock->shouldReceive('upload')->andReturn('https://fake.vercel.app/test.webp');
            $mock->shouldReceive('delete')->andReturn(true);
        });

        $response = $this->actingAs($this->admin)
            ->post(route('products.store'), [
                'name'           => 'Producto Admin',
                'code'           => '11111111',
                'purchase_price' => 5000,
                'sale_price'     => 10000,
                'tax'            => 19,
                'stock'          => 50,
                'min_stock'      => 5,
                'category_id'    => $this->category->id,
                'branch_id'      => $this->branch->id,
            ]);

        $response->assertRedirect(route('products.index'));
        $this->assertDatabaseHas('products', ['name' => 'Producto Admin']);
    });

    it('can access GET /cash-sessions', function () {
        $response = $this->actingAs($this->admin)
            ->get(route('cash-sessions.index'));

        $response->assertOk();
    });
});
