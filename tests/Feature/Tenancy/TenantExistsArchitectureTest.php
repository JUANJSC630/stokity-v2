<?php

use Illuminate\Support\Facades\Schema;
use Symfony\Component\Finder\Finder;

/**
 * A raw `exists:table,id` / `Rule::exists('table')` skips the TenantScope, so on
 * a table that has `tenant_id` it accepts ids from other tenants. Such rules must
 * go through App\Rules\TenantExists.
 *
 * @return list<string> "file:line table" for every unscoped usage
 */
function unscopedExistsRules(): array
{
    $offenders = [];
    $files = (new Finder)->files()->in(app_path())->name('*.php')->notName('TenantExists.php');

    foreach ($files as $file) {
        foreach (file($file->getRealPath()) as $index => $line) {
            preg_match_all('/exists:([a-z_]+)/', $line, $stringRules);
            preg_match_all('/Rule::exists\(\s*[\'"]([a-z_]+)[\'"]/', $line, $objectRules);

            foreach ([...$stringRules[1], ...$objectRules[1]] as $table) {
                if (Schema::hasColumn($table, 'tenant_id')) {
                    $offenders[] = $file->getRelativePathname().':'.($index + 1)." [{$table}]";
                }
            }
        }
    }

    return $offenders;
}

it('has no exists rule on a tenant table outside TenantExists', function () {
    expect(unscopedExistsRules())->toBe([]);
});
