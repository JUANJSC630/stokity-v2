<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Sale;

beforeEach(function () {
    $this->branch = Branch::factory()->create();
    $this->admin = adminUser($this->branch);
    $this->sale = Sale::factory()->create(['branch_id' => $this->branch->id, 'seller_id' => $this->admin->id, 'status' => 'completed']);
});

it('still builds the receipt when the logo points at an internal address, without a logo', function (string $logo) {
    BusinessSetting::factory()->create(['logo' => $logo, 'ticket_config' => ['show_logo' => true]]);

    $this->actingAs($this->admin)
        ->get(route('print.receipt', $this->sale))
        ->assertOk();
})->with([
    'cloud metadata' => ['http://169.254.169.254/latest/meta-data/'],
    'loopback' => ['http://127.0.0.1:9/logo.png'],
    'internal host' => ['http://localhost/logo.png'],
    'non-http scheme' => ['file:///etc/passwd'],
]);
