import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { LogOut, ShieldAlert } from 'lucide-react';

export default function ImpersonationBanner() {
    const { impersonating } = usePage<SharedData>().props;

    if (!impersonating?.active) return null;

    const stop = () => router.post('/stop-impersonating');

    return (
        <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-xs font-medium text-amber-950">
            <ShieldAlert className="h-3.5 w-3.5 flex-shrink-0" />
            <span>
                Viendo como <span className="font-semibold">{impersonating.tenantName}</span>
            </span>
            <button onClick={stop} className="flex items-center gap-1 rounded-md bg-amber-950/10 px-2 py-1 transition-colors hover:bg-amber-950/20">
                <LogOut className="h-3 w-3" />
                Salir
            </button>
        </div>
    );
}
