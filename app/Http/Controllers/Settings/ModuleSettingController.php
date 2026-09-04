<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\BusinessSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
        // must not silently re-enable it.
        $settings = BusinessSetting::getSettings();
        $moduleConfig = array_merge($settings->getModuleConfig(), $submitted);

        $settings->update(['module_config' => $moduleConfig]);

        return back()->with('success', 'Módulos actualizados correctamente.');
    }
}
