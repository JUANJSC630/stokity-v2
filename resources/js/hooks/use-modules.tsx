import { usePage } from '@inertiajs/react';
import type { SharedData } from '@/types';

/**
 * Reads the current tenant's module toggles (business.module_config,
 * shared via BusinessSetting::getSettings()). Independent of permissions —
 * see BusinessSetting::MODULE_DEFAULTS for the toggle-able set. A module
 * absent from the config (or the whole config being unset) is enabled —
 * fail open, so an existing tenant never loses a section it never touched.
 */
export function useModules() {
    const { business } = usePage<SharedData>().props;
    const config = business?.module_config ?? {};

    return {
        moduleEnabled: (module: string): boolean => config[module] ?? true,
    };
}
