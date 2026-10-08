<?php

use Symfony\Component\Process\Process;

/**
 * Behind Railway's proxy Laravel cannot tell the request is https, so the
 * "auto" value (null) of session.secure leaves session and XSRF cookies without the
 * Secure attribute. The real config is loaded in a separate process per environment.
 */
function sessionSecureWith(array $env): string
{
    $process = new Process([PHP_BINARY, 'artisan', 'config:show', 'session.secure'], base_path(), $env + ['SESSION_SECURE_COOKIE' => false]);
    $process->mustRun();

    preg_match('/session\.secure\s+\.+\s+(\S+)/', $process->getOutput(), $match);

    return $match[1] ?? 'unreadable';
}

it('marks session cookies Secure in production', function () {
    expect(sessionSecureWith(['APP_ENV' => 'production']))->toBe('true');
});

it('leaves local and test environments on plain http', function (string $environment) {
    expect(sessionSecureWith(['APP_ENV' => $environment]))->not->toBe('true');
})->with(['local', 'testing']);

it('still honours an explicit SESSION_SECURE_COOKIE override', function () {
    expect(sessionSecureWith(['APP_ENV' => 'production', 'SESSION_SECURE_COOKIE' => 'false']))->toBe('false');
    expect(sessionSecureWith(['APP_ENV' => 'local', 'SESSION_SECURE_COOKIE' => 'true']))->toBe('true');
});
