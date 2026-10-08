<?php

use App\Services\ReportExportService;

function csvLine(array $row): string
{
    $handle = fopen('php://memory', 'w+');
    $method = new ReflectionMethod(ReportExportService::class, 'writeRow');
    $method->invoke(new ReportExportService, $handle, $row);
    rewind($handle);
    $line = rtrim((string) stream_get_contents($handle), "\n");
    fclose($handle);

    return $line;
}

describe('CSV export neutralizes spreadsheet formulas', function () {
    it('prefixes text that a spreadsheet would run as a formula', function (string $payload) {
        $cell = str_getcsv(csvLine([$payload]), ';')[0];

        expect($cell)->toBe("'".$payload);
    })->with([
        'equals' => ['=1+1'],
        'plus formula' => ['+cmd|calc'],
        'minus formula' => ['-2+3+cmd'],
        'at sign' => ['@SUM(A1:A2)'],
        'hyperlink' => ['=HYPERLINK("http://evil.example","click")'],
    ]);

    it('also covers a leading tab or carriage return', function () {
        expect(csvLine(["\t=1+1"]))->toContain("'");
        expect(csvLine(["\r=1+1"]))->toContain("'");
    });

    it('leaves numbers, negative amounts and ordinary text untouched', function () {
        expect(csvLine([1500, '-5000', '+12', 3.5, 'Camiseta azul', '2026-10-07', null]))
            ->toBe('1500;-5000;+12;3.5;"Camiseta azul";2026-10-07;');
    });
});
