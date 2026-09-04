<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ModuleSettingController extends Controller
{
    public function edit(): Response
    {
        return Inertia::render('settings/modules', [
            'moduleConfig' => BusinessSetting::getSettings()->getModuleConfig(),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $modules = array_keys(BusinessSetting::MODULE_DEFAULTS);

        $validated = $request->validate([
            'modules' => ['required', 'array'],
            'modules.*' => ['boolean'],
        ]);

        // Ignore any key that isn't a real toggle-able module — the request
        // is just a form post, not a trusted source for what modules exist.
        $submitted = collect($validated['modules'])
            ->only($modules)
            ->map(fn ($enabled) => (bool) $enabled)
            ->all();

        // Merge onto the current config rather than replacing it outright —
        // a request that omits a known module key (e.g. a partial API call)
        // must not silently re-enable it. Locked inside a transaction: two
        // admins submitting concurrent partial updates must not race each
        // other's read-merge-write and clobber one another's toggle.
        DB::transaction(function () use ($submitted) {
            // Real tenants always have a row from provisioning — this only
            // matters as a safety net (e.g. a tenant provisioned before this
            // feature existed) before we lock it.
            BusinessSetting::getSettings();

            $settings = BusinessSetting::query()->lockForUpdate()->firstOrFail();
            $moduleConfig = array_merge($settings->getModuleConfig(), $submitted);
            $settings->update(['module_config' => $moduleConfig]);
        });

        return back()->with('success', 'Módulos actualizados correctamente.');
    }
}
