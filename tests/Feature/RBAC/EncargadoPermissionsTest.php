<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;
use App\Models\Product;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->encargado = managerUser($this->branch);

    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);
});

describe('Encargado — Cuenta propia', function () {
    it('can access GET /settings/profile', function () {
        $this->actingAs($this->encargado)
            ->get(route('profile.edit'))
            ->assertOk();
    });

    it('can access GET /settings/password', function () {
        $this->actingAs($this->encargado)
            ->get(route('password.edit'))
            ->assertOk();
    });

    it('can change its own password', function () {
        $response = $this->actingAs($this->encargado)
            ->from(route('password.edit'))
            ->put(route('password.update'), [
                'current_password' => 'password',
                'password' => 'nueva-clave-123',
                'password_confirmation' => 'nueva-clave-123',
            ]);

        $response->assertRedirect(route('password.edit'));
        expect(Hash::check('nueva-clave-123', $this->encargado->fresh()->password))->toBeTrue();
    });

    it('can update its own profile', function () {
        $this->actingAs($this->encargado)
            ->from(route('profile.edit'))
            ->patch(route('profile.update'), [
                'name' => 'Nombre Nuevo',
                'email' => $this->encargado->email,
            ])
            ->assertRedirect(route('profile.edit'));

        expect($this->encargado->fresh()->name)->toBe('Nombre Nuevo');
    });
});

describe('Encargado — Acceso que ya tenía (sin regresión)', function () {
    it('can access GET /reports', function () {
        $this->actingAs($this->encargado)->get(route('reports.index'))->assertOk();
    });

    it('can access GET /suppliers', function () {
        $this->actingAs($this->encargado)->get(route('suppliers.index'))->assertOk();
    });

    it('can access GET /stock-movements', function () {
        $this->actingAs($this->encargado)->get(route('stock-movements.index'))->assertOk();
    });

    it('can access GET /products', function () {
        $this->actingAs($this->encargado)->get(route('products.index'))->assertOk();
    });

    it('can access GET /finances', function () {
        $this->actingAs($this->encargado)->get(route('finances.summary'))->assertOk();
    });

    // Por URL ya entraba aunque el sidebar no se lo muestre: PR-0 no se lo quita.
    it('keeps access to the branches report', function () {
        $this->actingAs($this->encargado)->get(route('reports.branches'))->assertOk();
    });

    // Rutas con parámetros: el snapshot automático no las cubre.
    it('can open a supplier detail and edit form', function () {
        $supplier = \App\Models\Supplier::factory()->create(['branch_id' => $this->branch->id]);

        $this->actingAs($this->encargado)->get(route('suppliers.show', $supplier))->assertOk();
        $this->actingAs($this->encargado)->get(route('suppliers.edit', $supplier))->assertOk();
    });

    it('can create a supplier', function () {
        $this->actingAs($this->encargado)
            ->post(route('suppliers.store'), [
                'name' => 'Proveedor del Encargado',
                'branch_id' => $this->branch->id,
            ])
            ->assertRedirect(route('suppliers.index'));

        expect(\App\Models\Supplier::where('name', 'Proveedor del Encargado')->exists())->toBeTrue();
    });

    it('can open the stock movement create form and a product movements page', function () {
        $product = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
        ]);

        $this->actingAs($this->encargado)->get(route('stock-movements.create'))->assertOk();
        $this->actingAs($this->encargado)->get(route('stock-movements.product', $product))->assertOk();
    });

    it('can open a product detail and edit form', function () {
        $product = Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
        ]);

        $this->actingAs($this->encargado)->get(route('products.show', $product))->assertOk();
        $this->actingAs($this->encargado)->get(route('products.edit', $product))->assertOk();
    });
});

describe('Encargado — Sigue sin acceso', function () {
    it('cannot access GET /users', function () {
        $this->actingAs($this->encargado)
            ->get(route('users.index'))
            ->assertForbidden(); // can:users.view — admin-only in the catalog
    });

    it('cannot access GET /branches', function () {
        $this->actingAs($this->encargado)
            ->get(route('branches.index'))
            ->assertForbidden(); // can:branches.view — admin-only in the catalog
    });

    it('cannot access GET /settings/business', function () {
        $this->actingAs($this->encargado)
            ->get(route('settings.business'))
            ->assertForbidden(); // can:settings.business.view — admin-only in the catalog
    });

    it('cannot list users through the debug relationships endpoint', function () {
        $this->actingAs($this->encargado)
            ->get(route('users.relationships.definitive'))
            ->assertForbidden(); // can:users.view — admin-only in the catalog
    });
});

describe('Precio de compra en el payload de /products', function () {
    beforeEach(function () {
        Product::factory()->create([
            'branch_id' => $this->branch->id,
            'category_id' => $this->category->id,
            'purchase_price' => 5000,
        ]);
    });

    it('is sent to an encargado', function () {
        $this->actingAs($this->encargado)
            ->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->has('products.data.0.purchase_price'));
    });

    it('is NOT sent to a vendedor', function () {
        $this->actingAs(vendedorUser($this->branch))
            ->get(route('products.index'))
            ->assertInertia(fn ($page) => $page->missing('products.data.0.purchase_price'));
    });
});
