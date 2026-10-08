<?php

use Illuminate\Foundation\Events\DiagnosingHealth;
use Illuminate\Support\Facades\DB;

it('answers 200 on /up when the database is reachable', function () {
    $this->get('/up')->assertOk();
});

it('queries the database when diagnosing health', function () {
    DB::shouldReceive('select')->once()->with('select 1')->andReturn([]);

    event(new DiagnosingHealth);
});

it('lets a database failure propagate so /up answers 500', function () {
    DB::shouldReceive('select')->once()->with('select 1')->andThrow(new PDOException('connection refused'));

    expect(fn () => event(new DiagnosingHealth))->toThrow(PDOException::class);
});
