<?php

use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\StockMovementService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->category = Category::factory()->create();
    $this->user = User::factory()->create([
        'role' => 'administrador',
        'branch_id' => $this->branch->id,
        'status' => true,
    ]);
    $this->service = new StockMovementService;
    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id,
        'category_id' => $this->category->id,
        'stock' => 50,
        'tax' => 0,
    ]);
});

describe('StockMovementService::record()', function () {
    it('creates a StockMovement with all correct fields', function () {
        $movement = $this->service->record(
            product: $this->product,
            type: 'out',
            quantity: 3,
            previousStock: 50,
            newStock: 47,
            branchId: $this->branch->id,
            userId: $this->user->id,
            reference: 'TEST-001',
            notes: 'Venta test',
        );

        expect($movement)->toBeInstanceOf(StockMovement::class);
        expect($movement->product_id)->toBe($this->product->id);
        expect($movement->user_id)->toBe($this->user->id);
        expect($movement->branch_id)->toBe($this->branch->id);
        expect($movement->type)->toBe('out');
        expect($movement->quantity)->toBe(3);
        expect($movement->reference)->toBe('TEST-001');
        expect($movement->notes)->toBe('Venta test');
    });

    it('stores correct previous_stock and new_stock', function () {
        $movement = $this->service->record(
            product: $this->product,
            type: 'out',
            quantity: 5,
            previousStock: 50,
            newStock: 45,
            branchId: $this->branch->id,
            userId: $this->user->id,
        );

        expect($movement->previous_stock)->toBe(50);
        expect($movement->new_stock)->toBe(45);
    });

    it('type out decrements: new_stock = previous_stock - quantity', function () {
        $movement = $this->service->record(
            product: $this->product,
            type: 'out',
            quantity: 3,
            previousStock: 50,
            newStock: 47,
            branchId: $this->branch->id,
            userId: $this->user->id,
        );

        expect($movement->new_stock)->toBe($movement->previous_stock - $movement->quantity);
    });

    it('type ingreso increments: new_stock = previous_stock + quantity', function () {
        $movement = $this->service->record(
            product: $this->product,
            type: 'ingreso',
            quantity: 5,
            previousStock: 50,
            newStock: 55,
            branchId: $this->branch->id,
            userId: $this->user->id,
        );

        expect($movement->new_stock)->toBe($movement->previous_stock + $movement->quantity);
    });

    it('links supplier_id when provided', function () {
        $supplier = \App\Models\Supplier::factory()->create([
            'branch_id' => $this->branch->id,
        ]);

        $movement = $this->service->record(
            product: $this->product,
            type: 'ingreso',
            quantity: 10,
            previousStock: 50,
            newStock: 60,
            branchId: $this->branch->id,
            userId: $this->user->id,
            supplierId: $supplier->id,
        );

        expect($movement->supplier_id)->toBe($supplier->id);
    });
});
