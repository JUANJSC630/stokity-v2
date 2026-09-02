<?php

use App\Models\Branch;
use App\Models\BusinessSetting;
use App\Models\Category;
use App\Models\PaymentMethod;
use Illuminate\Support\Facades\Route;

/**
 * Recorre TODAS las rutas GET sin parámetros con cada rol y guarda el código de
 * respuesta. Se ejecuta antes y después del cambio; el diff debe estar vacío
 * salvo en lo que se quiso cambiar a propósito.
 */
it('captura el acceso de cada rol a cada ruta GET', function () {
    $branch = Branch::factory()->create();
    Category::factory()->create();
    BusinessSetting::factory()->create();
    PaymentMethod::factory()->create(['code' => 'cash']);

    $actors = [
        'administrador' => adminUser($branch),
        'encargado' => managerUser($branch),
        'vendedor' => vendedorUser($branch),
    ];

    $skip = ['home', 'login', 'register', 'password.request', 'password.reset', 'verification.notice', 'storage.local'];

    $snapshot = [];

    foreach (Route::getRoutes() as $route) {
        $name = $route->getName();

        if (! $name || in_array($name, $skip, true)) {
            continue;
        }
        if (! in_array('GET', $route->methods(), true)) {
            continue;
        }
        if (str_contains($route->uri(), '{')) {
            continue;
        }

        foreach ($actors as $role => $user) {
            try {
                $status = $this->actingAs($user)->get('/'.ltrim($route->uri(), '/'))->getStatusCode();
            } catch (\Throwable $e) {
                $status = 'EX:'.class_basename($e);
            }
            $snapshot[$route->uri()][$role] = $status;
        }
    }

    ksort($snapshot);

    $out = getenv('SNAPSHOT_OUT') ?: '/tmp/access-snapshot.json';
    file_put_contents($out, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    expect($snapshot)->not->toBeEmpty();
});
