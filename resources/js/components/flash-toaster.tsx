import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Pages that already render `flash.error` inside their own dialog; a toast on
 * top of it would show the same message twice.
 */
export const PAGES_HANDLING_FLASH_ERROR = ['products/index', 'products/edit'];

/**
 * Single place where the messages the backend flashes (`->with('success' | 'error' |
 * 'warning' | 'info', ...)`) become toasts, so no controller needs a page-level
 * effect for it and a failure can never be silent.
 */
export default function FlashToaster() {
    const { props, component } = usePage<SharedData>();
    const flash = props.flash ?? {};
    const handlesErrorItself = PAGES_HANDLING_FLASH_ERROR.includes(component);

    useEffect(() => {
        if (flash.success) toast.success(flash.success, { id: `flash-success-${flash.success}` });
    }, [flash.success]);

    useEffect(() => {
        if (flash.error && !handlesErrorItself) toast.error(flash.error, { id: `flash-error-${flash.error}` });
    }, [flash.error, handlesErrorItself]);

    useEffect(() => {
        if (flash.warning) toast(flash.warning, { id: `flash-warning-${flash.warning}`, icon: '⚠️' });
    }, [flash.warning]);

    useEffect(() => {
        if (flash.info) toast(flash.info, { id: `flash-info-${flash.info}`, icon: 'ℹ️' });
    }, [flash.info]);

    return null;
}
