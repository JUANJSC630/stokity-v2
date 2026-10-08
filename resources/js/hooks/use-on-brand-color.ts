import { DEFAULT_BRAND_PRIMARY, getReadableTextColor, type ReadableTextColor } from '@/lib/brand';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** White or near-black, whichever reads better on the business's primary brand color. */
export function useOnBrandColor(): ReadableTextColor {
    const { business } = usePage<SharedData>().props;

    return getReadableTextColor(business?.brand_color || DEFAULT_BRAND_PRIMARY);
}
