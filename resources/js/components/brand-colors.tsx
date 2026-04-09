import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

const DEFAULT_PRIMARY = '#C850C0';
const DEFAULT_SECONDARY = '#FFCC70';

function hexToRgb(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
}

/**
 * Injects brand color CSS custom properties via a <style> tag rendered
 * synchronously — no useEffect, no flash, no extra repaint.
 * The tag appears after app.css in the DOM so it wins by cascade order.
 */
export default function BrandColors() {
    const { business } = usePage<SharedData>().props;
    const primary = business.brand_color || DEFAULT_PRIMARY;
    const secondary = business.brand_color_secondary || DEFAULT_SECONDARY;
    const primaryRgb = hexToRgb(primary);
    const secondaryRgb = hexToRgb(secondary);

    return (
        <style>{`
            :root {
                --brand-primary: ${primary};
                --brand-primary-rgb: ${primaryRgb};
                --brand-secondary: ${secondary};
                --brand-secondary-rgb: ${secondaryRgb};
            }
        `}</style>
    );
}
