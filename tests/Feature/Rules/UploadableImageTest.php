<?php

use App\Models\User;
use App\Rules\UploadableImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

function validateImage(mixed $file): \Illuminate\Validation\Validator
{
    return Validator::make(['image' => $file], ['image' => ['nullable', new UploadableImage]]);
}

it('accepts the formats the WebP conversion can read', function (string $name) {
    expect(validateImage(UploadedFile::fake()->image($name, 40, 40))->passes())->toBeTrue();
})->with(['foto.jpg', 'foto.jpeg', 'logo.png', 'anim.gif', 'foto.webp']);

it('accepts a compressed phone photo up to 5 MB', function () {
    $file = UploadedFile::fake()->image('foto.jpg', 40, 40)->size(UploadableImage::MAX_KILOBYTES);

    expect(validateImage($file)->passes())->toBeTrue();
});

it('rejects images over 5 MB', function () {
    $validator = validateImage(UploadedFile::fake()->image('foto.jpg', 40, 40)->size(UploadableImage::MAX_KILOBYTES + 1));

    expect($validator->errors()->first('image'))->toBe('La imagen no debe pesar más de 5 MB.');
});

it('explains that an iPhone photo could not be converted', function (string $name, string $mime) {
    $validator = validateImage(UploadedFile::fake()->create($name, 500, $mime));

    expect($validator->errors()->first('image'))->toContain('HEIC');
})->with([
    'heic' => ['IMG_1665.HEIC', 'image/heic'],
    'heif' => ['IMG_0402.heif', 'image/heif'],
    'heic without mime' => ['IMG_0047.heic', 'application/octet-stream'],
]);

it('rejects files that are not images', function () {
    $validator = validateImage(UploadedFile::fake()->create('factura.pdf', 100, 'application/pdf'));

    expect($validator->errors()->first('image'))->toBe('La imagen debe ser JPG, PNG, GIF o WebP.');
});

it('rejects a value that is not an uploaded file', function () {
    expect(validateImage('not-a-file')->errors()->first('image'))->toBe('No se pudo recibir la imagen. Inténtalo de nuevo.');
});

it('skips validation when no image is sent', function () {
    expect(validateImage(null)->passes())->toBeTrue();
});

it('lets the profile photo take a compressed phone photo and rejects a raw heic', function () {
    config(['services.vercel_blob.token' => 'test-token-not-real']);
    Http::fake(['*' => Http::response(['url' => 'https://abc.public.blob.vercel-storage.com/x.webp'])]);
    $user = User::factory()->create(['role' => 'administrador', 'status' => true]);

    $this->actingAs($user)
        ->patch('/settings/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => UploadedFile::fake()->create('IMG_1665.HEIC', 900, 'image/heic'),
        ])
        ->assertSessionHasErrors('photo');

    $this->actingAs($user)
        ->patch('/settings/profile', [
            'name' => $user->name,
            'email' => $user->email,
            'photo' => UploadedFile::fake()->image('IMG_1665.jpg', 1600, 1200)->size(1500),
        ])
        ->assertSessionHasNoErrors();

    expect($user->refresh()->photo)->toBe('https://abc.public.blob.vercel-storage.com/x.webp');
});
