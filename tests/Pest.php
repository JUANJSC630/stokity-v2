<?php

use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(Tests\TestCase::class)->in('Feature', 'Unit');
uses(RefreshDatabase::class)->in('Feature');

/*
 * The suite runs on SQLite while production is MySQL. The period reports group by
 * MySQL's DATE_FORMAT, so emulate the few formats the app uses; otherwise those
 * queries cannot run in tests at all.
 */
uses()->beforeEach(function () {
    $connection = DB::connection();

    if ($connection->getDriverName() !== 'sqlite') {
        return;
    }

    $connection->getPdo()->sqliteCreateFunction('DATE_FORMAT', function (?string $date, string $format): ?string {
        if ($date === null) {
            return null;
        }

        return date(strtr($format, ['%Y' => 'Y', '%m' => 'm', '%d' => 'd', '%u' => 'W']), strtotime($date));
    }, 2);
})->in('Feature');

function adminUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'administrador',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}

function managerUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'encargado',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}

function vendedorUser(?Branch $branch = null): User
{
    $branch ??= Branch::factory()->create();

    return User::factory()->create([
        'role' => 'vendedor',
        'branch_id' => $branch->id,
        'status' => true,
    ]);
}
