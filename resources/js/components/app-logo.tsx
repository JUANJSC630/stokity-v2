import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { business } = usePage<SharedData>().props;

    return (
        <>
            <div className="flex aspect-square size-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700">
                <img src={business.logo_url} alt={business.name} className="h-full w-full object-cover" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">{business.name}</span>
            </div>
        </>
    );
}
