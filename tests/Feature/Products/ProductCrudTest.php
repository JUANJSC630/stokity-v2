<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    $this->mock(\App\Services\BlobStorageService::class, function ($mock) {
        $mock->shouldReceive('upload')->andReturn('https://fake.vercel.app/test.webp');
        $mock->shouldReceive('delete')->andReturn(true);
    });
});

function productPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Producto Test',
        'code' => '88888888',
        'purchase_price' => 5000,
        'sale_price' => 10000,
        'tax' => 19,
        'stock' => 50,
        'min_stock' => 5,
        'category_id' => test()->category->id,
        'branch_id' => test()->branch->id,
    ], $overrides);
}

describe('Product CRUD', function () {
    it('admin can create product', function () {
        $admin = adminUser($this->branch);

        $response = $this->actingAs($admin)
            ->post(route('products.store'), productPayload());

        $response->assertRedirect(route('products.index'));
        $this->assertDatabaseHas('products', ['name' => 'Producto Test']);
    });

    it('encargado can create product', function () {
        $manager = managerUser($this->branch);

        $response = $this->actingAs($manager)
            ->post(route('products.store'), productPayload(['code' => '77777777']));

        $response->assertRedirect(route('products.index'));
    });

    it('vendedor is blocked by middleware', function () {
        $vendedor = vendedorUser($this->branch);

        $response = $this->actingAs($vendedor)
            ->post(route('products.store'), productPayload(['code' => '66666666']));

        // AdminOrManagerMiddleware redirects non-JSON requests to dashboard
        $response->assertRedirect(route('dashboard'));
    });

    it('name is required', function () {
        $admin = adminUser($this->branch);

        $response = $this->actingAs($admin)
            ->post(route('products.store'), productPayload(['name' => '']));

        $response->assertSessionHasErrors('name');
    });

    it('sale_price must be numeric and min 0', function () {
        $admin = adminUser($this->branch);

        $response = $this->actingAs($admin)
            ->post(route('products.store'), productPayload([
                'sale_price' => -100,
                'code' => '55555555',
            ]));

        $response->assertSessionHasErrors('sale_price');
    });

    it('product code must be unique', function () {
        $admin = adminUser($this->branch);

        Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'code' => 'DUPE1234',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('products.store'), productPayload(['code' => 'DUPE1234']));

        $response->assertSessionHasErrors('code');
    });
});
