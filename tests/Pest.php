<?php

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(Tests\TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature');

function adminUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role'      => 'administrador',
        'branch_id' => $branch->id,
        'status'    => true,
    ]);
}

function managerUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role'      => 'encargado',
        'branch_id' => $branch->id,
        'status'    => true,
    ]);
}

function vendedorUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role'      => 'vendedor',
        'branch_id' => $branch->id,
        'status'    => true,
    ]);
}
