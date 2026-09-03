<?php

use App\Authorization\PermissionCatalog;

it('has no duplicate permission names across modules', function () {
    // array_merge() in PermissionCatalog::all() would silently drop a
    // duplicate key instead of erroring, so count each module's raw keys
    // against the merged result to catch that.
    $reflection = new ReflectionClass(PermissionCatalog::class);
    $modules = collect($reflection->getMethods(ReflectionMethod::IS_PRIVATE))
        ->filter(fn ($m) => $m->isStatic())
        ->map(function ($method) {
            $method->setAccessible(true);

            return array_keys($method->invoke(null));
        });

    $totalRaw = $modules->flatten()->count();
    $totalMerged = count(PermissionCatalog::all());

    expect($totalMerged)->toBe($totalRaw);
});

it('only references permissions that exist in requires', function () {
    $names = PermissionCatalog::names();

    foreach (PermissionCatalog::all() as $name => $meta) {
        foreach ($meta['requires'] ?? [] as $dependency) {
            $found = in_array($dependency, $names, true);
            expect($found)->toBeTrue("«{$name}» requires unknown permission «{$dependency}»");
        }
    }
});

it('never lets a permission require itself, directly or in a cycle', function () {
    $catalog = PermissionCatalog::all();

    foreach (array_keys($catalog) as $name) {
        $seen = [];
        $stack = $catalog[$name]['requires'] ?? [];

        while ($stack) {
            $dep = array_pop($stack);
            expect($dep)->not->toBe($name, "«{$name}» has a circular dependency");

            if (! isset($seen[$dep])) {
                $seen[$dep] = true;
                $stack = [...$stack, ...($catalog[$dep]['requires'] ?? [])];
            }
        }
    }
});

it('keeps profile permissions out of the assignable, per-role catalog', function () {
    $alwaysGranted = PermissionCatalog::alwaysGranted();

    foreach ($alwaysGranted as $name) {
        expect(PermissionCatalog::all()[$name]['module'])->toBe('profile');
    }

    expect($alwaysGranted)->not->toBeEmpty();
});

it('groups every assignable permission under its module in byModule(), excluding alwaysGranted()', function () {
    $byModule = PermissionCatalog::byModule();
    $total = collect($byModule)->sum(fn ($perms) => count($perms));

    expect($total)->toBe(count(PermissionCatalog::all()) - count(PermissionCatalog::alwaysGranted()))
        ->and($byModule)->not->toHaveKey('profile');
});
