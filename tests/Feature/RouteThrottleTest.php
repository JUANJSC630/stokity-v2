<?php

use App\Models\Branch;
use App\Models\BusinessSetting;

beforeEach(function () {
    BusinessSetting::factory()->create();
    $this->admin = adminUser(Branch::factory()->create());
});

it('lets a barcode scanner search the catalog far above one request a second', function () {
    $this->actingAs($this->admin);

    foreach (range(1, 150) as $attempt) {
        $this->getJson(route('api.products.search', ['q' => 'x']))->assertOk();
    }
});

it('still throttles the product search eventually', function () {
    $this->actingAs($this->admin);

    $statuses = collect(range(1, 260))->map(fn () => $this->getJson(route('api.products.search', ['q' => 'x']))->status());

    expect($statuses->contains(429))->toBeTrue();
});

it('rate limits the QZ signing endpoint', function () {
    config(['services.qz_tray.private_key_b64' => '']);
    $this->actingAs($this->admin);

    $statuses = collect(range(1, 140))->map(fn () => $this->get(route('qz.sign', ['request' => 'x']))->status());

    expect($statuses->contains(429))->toBeTrue();
    expect($statuses->take(100)->contains(429))->toBeFalse();
});
