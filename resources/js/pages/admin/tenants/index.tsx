import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Building2, Pause, Play, Plus } from 'lucide-react';

interface TenantRow {
    id: number;
    name: string;
    slug: string;
    status: string;
    created_at: string | null;
    users_count: number;
    products_count: number;
    sales_count: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Negocios', href: '/admin/tenants' }];

const statusStyles: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    trial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

export default function TenantsIndex({ tenants }: { tenants: TenantRow[] }) {
    const toggle = (t: TenantRow) => {
        const action = t.status === 'suspended' ? 'activate' : 'suspend';
        router.post(`/admin/tenants/${t.id}/${action}`, {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Negocios" />
            <div className="flex flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold">Negocios (Tenants)</h1>
                        <p className="text-sm text-muted-foreground">Gestiona los clientes de la plataforma.</p>
                    </div>
                    <Button asChild>
                        <Link href="/admin/tenants/create">
                            <Plus className="mr-2 h-4 w-4" /> Nuevo negocio
                        </Link>
                    </Button>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Building2 className="h-4 w-4" /> {tenants.length} negocio(s)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground">
                                <tr className="border-b">
                                    <th className="py-2 pr-4">Negocio</th>
                                    <th className="py-2 pr-4">Estado</th>
                                    <th className="py-2 pr-4">Usuarios</th>
                                    <th className="py-2 pr-4">Productos</th>
                                    <th className="py-2 pr-4">Ventas</th>
                                    <th className="py-2 pr-4">Creado</th>
                                    <th className="py-2 pr-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.map((t) => (
                                    <tr key={t.id} className="border-b last:border-0">
                                        <td className="py-2 pr-4">
                                            <div className="font-medium">{t.name}</div>
                                            <div className="text-xs text-muted-foreground">{t.slug}</div>
                                        </td>
                                        <td className="py-2 pr-4">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[t.status] ?? ''}`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="py-2 pr-4">{t.users_count}</td>
                                        <td className="py-2 pr-4">{t.products_count}</td>
                                        <td className="py-2 pr-4">{t.sales_count}</td>
                                        <td className="py-2 pr-4 text-muted-foreground">{t.created_at}</td>
                                        <td className="py-2 pr-4 text-right">
                                            <Button variant="outline" size="sm" onClick={() => toggle(t)}>
                                                {t.status === 'suspended' ? (
                                                    <>
                                                        <Play className="mr-1 h-3 w-3" /> Activar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pause className="mr-1 h-3 w-3" /> Suspender
                                                    </>
                                                )}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {tenants.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                            Aún no hay negocios. Crea el primero.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
