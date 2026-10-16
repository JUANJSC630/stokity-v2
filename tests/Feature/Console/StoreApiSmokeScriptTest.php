<?php

use Illuminate\Support\Facades\Process;

/**
 * The smoke script itself is exercised end to end against a live instance
 * (see docs/api-store.md); these tests cover what needs no server: usage
 * errors, a failed connection and — above all — that a key never appears in
 * its output.
 */
function runSmokeScript(array $env): \Illuminate\Contracts\Process\ProcessResult
{
    return Process::path(base_path())->env($env)->run('scripts/store-api-smoke.sh');
}

it('is executable', function () {
    expect(is_executable(base_path('scripts/store-api-smoke.sh')))->toBeTrue();
});

it('exits 2 with a usage message when a variable is missing, naming the variable but never a key', function (string $missing) {
    $env = [
        'STORE_BASE_URL' => 'http://127.0.0.1:1',
        'STORE_READ_KEY' => 'sk_store_READKEYSECRET',
        'STORE_ORDERS_KEY' => 'sk_store_ORDERSKEYSECRET',
        'STORE_ADMIN_KEY' => 'sk_store_ADMINKEYSECRET',
    ];
    $env[$missing] = '';

    $result = runSmokeScript($env);

    expect($result->exitCode())->toBe(2)
        ->and($result->errorOutput())->toContain("falta {$missing}")
        ->and($result->output().$result->errorOutput())->not->toContain('KEYSECRET');
})->with(['STORE_BASE_URL', 'STORE_READ_KEY', 'STORE_ORDERS_KEY', 'STORE_ADMIN_KEY']);

it('exits 1 when the server cannot be reached and never prints the keys', function () {
    $result = runSmokeScript([
        'STORE_BASE_URL' => 'http://127.0.0.1:1',
        'STORE_READ_KEY' => 'sk_store_READKEYSECRET',
        'STORE_ORDERS_KEY' => 'sk_store_ORDERSKEYSECRET',
        'STORE_ADMIN_KEY' => 'sk_store_ADMINKEYSECRET',
    ]);

    expect($result->exitCode())->toBe(1)
        ->and($result->output())->toContain('no se pudo conectar')
        ->and($result->output())->toContain('0 aprobadas, 1 falladas')
        ->and($result->output().$result->errorOutput())->not->toContain('KEYSECRET');
});

it('never passes a key on the curl command line', function () {
    $script = file_get_contents(base_path('scripts/store-api-smoke.sh'));

    expect($script)->toContain('curl -sS -K -')
        ->and($script)->not->toMatch('/-H\s+["\']Authorization/')
        ->and($script)->not->toContain('set -x');
});
