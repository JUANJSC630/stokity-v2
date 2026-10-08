<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\Client;
use App\Models\CreditPayment;
use App\Models\CreditSale;
use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleProduct;
use App\Models\SaleReturn;
use App\Models\SaleReturnProduct;
use App\Services\Credit\CreditPaymentService;

/**
 * Every ticket template the till can print had no test except the sale receipt and the
 * cash-session report (PrintController was at ~49 percent). Each one is rendered with
 * real data in both paper widths: it must be a real ESC/POS byte stream carrying the data
 * the customer expects, and another branch's user must not be able to read it.
 */
function printedBytes($response): string
{
    $response->assertOk();
    $bytes = base64_decode((string) $response->json('data'), true);

    expect($bytes)->not->toBeFalse();
    expect($bytes)->toContain("\x1b");
    expect(strlen($bytes))->toBeGreaterThan(150);

    return $bytes;
}

beforeEach(function () {
    BusinessSetting::factory()->create(['name' => 'Tienda Prueba', 'ticket_config' => ['show_logo' => false]]);
    PaymentMethod::factory()->create(['code' => 'efectivo', 'name' => 'Efectivo', 'is_active' => true]);

    $this->branch = Branch::factory()->create(['name' => 'Sucursal Uno']);
    $this->otherBranch = Branch::factory()->create();
    $this->admin = adminUser($this->branch);
    $this->seller = vendedorUser($this->branch);
    $this->outsider = vendedorUser($this->otherBranch);
    $this->client = Client::factory()->create(['name' => 'Cliente Impreso']);

    $this->product = Product::factory()->create([
        'branch_id' => $this->branch->id, 'category_id' => Category::factory()->create()->id,
        'name' => 'Camiseta Azul', 'sale_price' => 50000, 'stock' => 10, 'tax' => 0, 'status' => true, 'type' => 'producto',
    ]);

    $this->sale = Sale::factory()->create([
        'branch_id' => $this->branch->id, 'seller_id' => $this->admin->id, 'client_id' => $this->client->id,
        'status' => 'completed', 'payment_method' => 'efectivo', 'total' => 100000, 'net' => 100000, 'amount_paid' => 100000,
    ]);
    SaleProduct::factory()->create(['sale_id' => $this->sale->id, 'product_id' => $this->product->id, 'quantity' => 2, 'price' => 50000, 'subtotal' => 100000]);

    $this->return = SaleReturn::create(['sale_id' => $this->sale->id, 'user_id' => $this->admin->id, 'reason' => 'Talla incorrecta']);
    SaleReturnProduct::create(['sale_return_id' => $this->return->id, 'product_id' => $this->product->id, 'quantity' => 1, 'effective_price' => 50000]);

    $this->actingAs($this->admin)->post(route('credits.store'), [
        'type' => 'layaway', 'client_id' => $this->client->id, 'branch_id' => $this->branch->id,
        'items' => [['product_id' => $this->product->id, 'quantity' => 2, 'unit_price' => 50000, 'subtotal' => 100000]],
    ]);
    $this->credit = CreditSale::firstOrFail();
    app(CreditPaymentService::class)->register($this->credit, 30000, 'efectivo', $this->admin, 'Abono de prueba');
    $this->payment = CreditPayment::firstOrFail();
});

describe('ticket templates render a real ESC/POS stream', function () {
    it('prints a sale receipt', function (int $width) {
        $bytes = printedBytes($this->actingAs($this->admin)->getJson(route('print.receipt', [$this->sale, 'width' => $width])));

        expect($bytes)->toContain('Camiseta')->toContain($this->sale->code);
    })->with([58, 80]);

    it('prints a return receipt', function (int $width) {
        $bytes = printedBytes($this->actingAs($this->admin)->getJson(route('print.return-receipt', [$this->return, 'width' => $width])));

        expect($bytes)->toContain('Camiseta');
    })->with([58, 80]);

    it('prints a credit receipt', function (int $width) {
        $bytes = printedBytes($this->actingAs($this->admin)->getJson(route('print.credit', [$this->credit, 'width' => $width])));

        expect($bytes)->toContain($this->credit->code)->toContain('Camiseta');
    })->with([58, 80]);

    it('prints a credit payment receipt', function (int $width) {
        $bytes = printedBytes($this->actingAs($this->admin)->getJson(route('print.credit-payment', [$this->payment, 'width' => $width])));

        expect($bytes)->toContain($this->credit->code);
    })->with([58, 80]);

    it('prints the test page', function (int $width) {
        $bytes = printedBytes($this->actingAs($this->admin)->getJson(route('print.test', ['width' => $width])));

    })->with([58, 80]);

    it('previews every template with the unsaved form configuration', function (string $template) {
        $response = $this->actingAs($this->admin)->postJson(route('print.test-template'), [
            'template_type' => $template, 'paper_width' => 80, 'show_logo' => false,
        ]);

        printedBytes($response);
    })->with(['sale', 'return']);
});

describe('another branch cannot read the tickets', function () {
    it('forbids a seller of a different branch', function (string $route) {
        $parameters = ['print.receipt' => $this->sale, 'print.return-receipt' => $this->return, 'print.credit' => $this->credit, 'print.credit-payment' => $this->payment];

        $this->actingAs($this->outsider)->getJson(route($route, $parameters[$route]))->assertForbidden();
    })->with(['print.receipt', 'print.return-receipt', 'print.credit', 'print.credit-payment']);

    it('lets the seller of the same branch read them', function () {
        $this->actingAs($this->seller)->getJson(route('print.receipt', $this->sale))->assertOk();
        $this->actingAs($this->seller)->getJson(route('print.credit', $this->credit))->assertOk();
    });
});

it('answers 401 to guests', function () {
    auth()->logout();

    $this->getJson(route('print.receipt', $this->sale))->assertUnauthorized();
});
