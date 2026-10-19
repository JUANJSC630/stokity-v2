import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** Whether the current tenant has an external web store connected (shared via HandleInertiaRequests → hasWebStore). */
export function useWebStore(): boolean {
    return usePage<SharedData>().props.hasWebStore ?? false;
}
