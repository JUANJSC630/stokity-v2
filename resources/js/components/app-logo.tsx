import { getRoleLabel } from '@/lib/roles';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export default function AppLogo({ showRole = false }: { showRole?: boolean }) {
    const { business, auth } = usePage<SharedData>().props;
    const roleLabel = showRole ? getRoleLabel(auth?.user?.role) : '';

    return (
        <>
            <div className="flex aspect-square size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
                <img
                    src={business.logo_url}
                    alt={business.name}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = '/stokity-icon.png';
                    }}
                />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{business.name}</span>
                {roleLabel && <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>}
            </div>
        </>
    );
}
