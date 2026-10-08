<?php

use App\Services\RemoteImageFetcher;

describe('RemoteImageFetcher::resolvePublicAddress', function () {
    it('rejects every address that is not a plain public http(s) host', function (string $url) {
        expect((new RemoteImageFetcher)->resolvePublicAddress($url))->toBeNull();
    })->with([
        'loopback' => ['http://127.0.0.1/logo.png'],
        'localhost' => ['http://localhost/logo.png'],
        'cloud metadata' => ['http://169.254.169.254/latest/meta-data/'],
        'private 10/8' => ['https://10.0.0.5/logo.png'],
        'private 192.168/16' => ['https://192.168.1.10/logo.png'],
        'private 172.16/12' => ['https://172.16.0.1/logo.png'],
        'ipv6 loopback' => ['http://[::1]/logo.png'],
        'ipv6 unique local' => ['http://[fd00::1]/logo.png'],
        'decimal ip' => ['http://2130706433/logo.png'],
        'hex ip' => ['http://0x7f000001/logo.png'],
        'zero address' => ['http://0.0.0.0/logo.png'],
        'file scheme' => ['file:///etc/passwd'],
        'ftp scheme' => ['ftp://93.184.216.34/logo.png'],
        'gopher scheme' => ['gopher://93.184.216.34/'],
        'credentials in url' => ['https://user:secret@93.184.216.34/logo.png'],
        'no host' => ['https:///logo.png'],
        'not a url' => ['not a url'],
        'empty' => [''],
    ]);

    it('accepts a public ip literal and returns the address to pin the connection to', function () {
        $target = (new RemoteImageFetcher)->resolvePublicAddress('https://93.184.216.34/logo.png');

        expect($target)->toBe(['host' => '93.184.216.34', 'port' => 443, 'ip' => '93.184.216.34']);
    });

    it('uses the explicit port and the http default', function () {
        $fetcher = new RemoteImageFetcher;

        expect($fetcher->resolvePublicAddress('http://93.184.216.34/x.png')['port'])->toBe(80);
        expect($fetcher->resolvePublicAddress('https://93.184.216.34:8443/x.png')['port'])->toBe(8443);
    });
});

describe('RemoteImageFetcher::fetch', function () {
    it('never fetches an address that is not public', function () {
        expect((new RemoteImageFetcher)->fetch('http://169.254.169.254/latest/meta-data/'))->toBeNull();
        expect((new RemoteImageFetcher)->fetch('http://127.0.0.1:80/'))->toBeNull();
    });
});
