import { BranchStatusPill, PersonAvatar } from '@/components/branches/branch-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useOnBrandColor } from '@/hooks/use-on-brand-color';
import AppLayout from '@/layouts/app-layout';
import { type Branch, type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Building, Edit, Mail, MapPin, Phone, Trash2, User as UserIcon, Users } from 'lucide-react';
import { type ReactNode, useState } from 'react';

interface Props {
    branch: Branch;
}

function InfoItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-muted-foreground/60" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <h3 className="text-[11px] text-muted-foreground">{label}</h3>
                <p className="text-sm font-medium break-words">{children}</p>
            </div>
        </div>
    );
}

function Panel({ title, icon, aside, children }: { title: string; icon: ReactNode; aside?: ReactNode; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    <span aria-hidden="true">{icon}</span>
                    {title}
                </h2>
                {aside}
            </div>
            {children}
        </section>
    );
}

export default function BranchDetail({ branch }: Props) {
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const onBrand = useOnBrandColor();

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Sucursales',
            href: '/branches',
        },
        {
            title: branch.name,
            href: `/branches/${branch.id}`,
        },
    ];

    const handleDelete = () => {
        router.delete(`/branches/${branch.id}`, {
            onSuccess: () => {
                // Redirección se maneja automáticamente
            },
        });
    };

    const sellers = branch.employees?.filter((emp) => emp.role === 'vendedor') ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Sucursal - ${branch.name}`} />
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/branches"
                            aria-label="Volver"
                            className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground transition-colors hover:text-foreground"
                        >
                            <ArrowLeft className="size-4" aria-hidden="true" />
                        </Link>
                        <h1 className="min-w-0 truncate text-xl font-bold tracking-tight sm:text-2xl">{branch.name}</h1>
                        <BranchStatusPill active={branch.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Link
                            href={`/branches/${branch.id}/edit`}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold transition-opacity hover:opacity-90 sm:h-10"
                            style={{ color: onBrand.hex }}
                        >
                            <Edit className="size-4" aria-hidden="true" />
                            <span>Editar</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setDeleteModalOpen(true)}
                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-card px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:h-10 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                            <span>Eliminar</span>
                        </button>
                    </div>
                </div>

                <Panel title="Información de la Sucursal" icon={<Building className="size-4" />}>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoItem icon={<MapPin className="size-4" />} label="Dirección">
                            {branch.address}
                        </InfoItem>
                        <InfoItem icon={<Phone className="size-4" />} label="Teléfono">
                            {branch.phone}
                        </InfoItem>
                        {branch.email && (
                            <InfoItem icon={<Mail className="size-4" />} label="Email">
                                {branch.email}
                            </InfoItem>
                        )}
                        <InfoItem icon={<Building className="size-4" />} label="Nombre comercial">
                            {branch.business_name}
                        </InfoItem>
                    </div>
                </Panel>

                <Panel title="Encargado de Sucursal" icon={<UserIcon className="size-4" />}>
                    {branch.manager ? (
                        <div className="flex items-start gap-4 rounded-xl border border-border/60 p-4">
                            <PersonAvatar name={branch.manager.name} photoUrl={branch.manager.photo_url} className="size-12" />
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                    <Link href={`/users/${branch.manager.id}`} className="text-base font-medium hover:underline">
                                        {branch.manager.name}
                                    </Link>
                                    <Badge className="self-start">Encargado</Badge>
                                </div>
                                <p className="truncate text-sm text-muted-foreground">{branch.manager.email}</p>
                                <p className="pt-1 text-xs text-muted-foreground italic">
                                    El encargado es responsable de administrar esta sucursal y sus vendedores
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
                            <UserIcon className="mx-auto size-12 opacity-40" aria-hidden="true" />
                            <p className="mt-3 text-muted-foreground">No hay encargado asignado a esta sucursal</p>
                            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                Se recomienda asignar un encargado para garantizar la correcta administración de la sucursal
                            </p>
                        </div>
                    )}
                </Panel>

                <Panel title="Vendedores" icon={<Users className="size-4" />} aside={<Badge variant="outline">{sellers.length} vendedores</Badge>}>
                    {sellers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {sellers.map((employee) => (
                                <div key={employee.id} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                                    <PersonAvatar name={employee.name} photoUrl={employee.photo_url} className="size-10" />
                                    <div className="min-w-0">
                                        <Link href={`/users/${employee.id}`} className="block truncate text-sm font-medium hover:underline">
                                            {employee.name}
                                        </Link>
                                        <p className="truncate text-sm text-muted-foreground">{employee.email}</p>
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                            <Badge>Vendedor</Badge>
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                                style={{
                                                    borderColor: employee.status ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
                                                    color: employee.status ? 'rgb(74 222 128)' : 'rgb(239 68 68)',
                                                }}
                                            >
                                                {employee.status ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-center">
                            <Users className="mx-auto size-12 opacity-40" aria-hidden="true" />
                            <p className="mt-3 text-muted-foreground">No hay vendedores asignados a esta sucursal</p>
                            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
                                Para asignar vendedores a esta sucursal, edite el perfil de los usuarios y seleccione esta sucursal
                            </p>
                        </div>
                    )}
                </Panel>
            </div>

            <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-destructive" />
                            Confirmar eliminación
                        </DialogTitle>
                    </DialogHeader>
                    <DialogDescription>
                        <p>
                            ¿Está seguro de eliminar la sucursal <strong>{branch.name}</strong>? Esta acción puede ser revertida posteriormente.
                        </p>
                    </DialogDescription>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
