<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    BusinessSetting::factory()->create();
    $this->admin = adminUser(Branch::factory()->create());
});

it('shares every flash message kind with the page', function (string $kind) {
    $this->actingAs($this->admin)
        ->withSession([$kind => "mensaje {$kind}"])
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page->where("flash.{$kind}", "mensaje {$kind}"));
})->with(['success', 'error', 'warning', 'info']);

it('shares null when there is no flash message', function () {
    $this->actingAs($this->admin)
        ->get(route('dashboard'))
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('flash.success', null)
            ->where('flash.error', null)
            ->where('flash.warning', null)
            ->where('flash.info', null));
});

it('surfaces the error of a blocked own-user delete', function () {
    $this->actingAs($this->admin)
        ->from(route('dashboard'))
        ->delete(route('users.destroy', $this->admin))
        ->assertSessionHas('error');
});
