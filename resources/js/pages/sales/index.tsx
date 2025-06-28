import { PlaceholderPattern } from '@/components/ui/placeholder-pattern';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Administrar Ventas',
        href: '/sales',
    },
];

export default function Sales() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Administrar Ventas" />
            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">Administración de Ventas</h1>
                    <Button className="flex gap-1">
                        <Plus className="size-4" />
                        <span>Nueva Venta</span>
                    </Button>
                </div>

                <div className="relative mb-4 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Buscar ventas..."
                        className="w-full pl-10"
                    />
                </div>

                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <PlaceholderPattern className="absolute inset-0 size-full stroke-neutral-900/20 dark:stroke-neutral-100/20" />
                    <div className="relative z-10 p-6 text-center">
                        <p className="text-muted-foreground">Contenido de la tabla de ventas irá aquí</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
