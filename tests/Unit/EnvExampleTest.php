<?php

/**
 * .env.example is committed (and the repository is public): it must never carry a
 * real secret. APP_KEY signs cookies and URLs, so a key committed here is a key
 * anyone can use.
 */
function envExampleValue(string $name): ?string
{
    foreach (file(base_path('.env.example'), FILE_IGNORE_NEW_LINES) as $line) {
        if (str_starts_with($line, $name.'=')) {
            return trim(substr($line, strlen($name) + 1), " \t\"'");
        }
    }

    return null;
}

it('does not commit an application key', function () {
    expect(envExampleValue('APP_KEY'))->toBe('');
});

it('does not commit any secret value', function (string $name) {
    $value = envExampleValue($name);

    expect($value === null || $value === '' || $value === 'null')->toBeTrue("{$name} must be empty in .env.example");
})->with([
    'DB_PASSWORD', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'BLOB_READ_WRITE_TOKEN',
    'PRINTER_PRIVATE_KEY_B64', 'PRINTER_CERTIFICATE_B64', 'MAIL_PASSWORD', 'REDIS_PASSWORD',
]);
