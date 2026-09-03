<?php

/**
 * array_all() ships natively as of PHP 8.4 (php.net RFC "array_find/any/all").
 * This project requires PHP ^8.3 (composer.json), but spatie/laravel-permission's
 * 6.x/7.x/8.x lines all call it unconditionally in
 * PermissionRegistrar::getPermissions(), with no polyfill of their own — so on
 * 8.3 the very first role/permission lookup fatals with "Call to undefined
 * function array_all()".
 *
 * Self-removing: guarded by function_exists(), so this becomes a silent no-op
 * the day the runtime is actually PHP 8.4+ and the native function takes over.
 */
if (! function_exists('array_all')) {
    function array_all(array $array, callable $callback): bool
    {
        foreach ($array as $key => $value) {
            if (! $callback($value, $key)) {
                return false;
            }
        }

        return true;
    }
}
