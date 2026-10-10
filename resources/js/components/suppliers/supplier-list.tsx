import { initialsOf } from '@/components/admin/tenant-badges';
import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { cn } from '@/lib/utils';
import { type Supplier } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye, Mail, Phone } from 'lucide-react';

export function SupplierAvatar({ name, className }: { name: string; className?: string }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]',
                className,
            )}
        >
            {initialsOf(name) || '?'}
        </span>
    );
}

export function SupplierStatusPill({ active, className }: { active: boolean; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-muted text-muted-foreground',
                className,
            )}
        >
            <span aria-hidden="true" className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-muted-foreground/60')} />
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );
}

interface SupplierListProps {
    suppliers: Supplier[];
    /** The branch column only makes sense for people who can see several branches. */
    showBranch: boolean;
}

/** Phones: a tappable row per supplier; swipe (or the row menu) to call or open it. */
export function SupplierCards({ suppliers }: SupplierListProps) {
    return (
        <SwipeActions label={`${suppliers.length} proveedor(es)`}>
            {suppliers.map((supplier, index) => (
                <SwipeActionsRow
                    key={supplier.id}
                    label={supplier.name}
                    fullSwipe={false}
                    trailing={[
                        ...(supplier.phone
                            ? [
                                  {
                                      label: 'Llamar',
                                      icon: <Phone />,
                                      tone: 'neutral' as const,
                                      onSelect: () => window.location.assign(`tel:${supplier.phone}`),
                                      keepRow: true,
                                  },
                              ]
                            : []),
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(route('suppliers.show', supplier.id)),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={route('suppliers.show', supplier.id)} className="flex min-w-0 items-center gap-3">
                            <SupplierAvatar name={supplier.name} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-[15px] leading-tight font-semibold">{supplier.name}</span>
                                    {!supplier.status && <SupplierStatusPill active={false} className="px-2 py-0.5" />}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {supplier.nit ? `NIT ${supplier.nit}` : 'Sin NIT'}
                                    {supplier.contact_name ? ` · ${supplier.contact_name}` : ''}
                                </span>
                                {(supplier.phone || supplier.email) && (
                                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {supplier.phone && (
                                            <span className="flex min-w-0 items-center gap-1">
                                                <Phone className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{supplier.phone}</span>
                                            </span>
                                        )}
                                        {supplier.email && (
                                            <span className="flex min-w-0 items-center gap-1">
                                                <Mail className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{supplier.email}</span>
                                            </span>
                                        )}
                                    </span>
                                )}
                            </span>
                        </Link>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

const HEAD = 'px-3 py-3 font-medium';

/** Desktop: a table whose rows open the supplier, with the phone one tap away. */
export function SupplierTable({ suppliers, showBranch }: SupplierListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Proveedores</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Proveedor
                    </th>
                    <th scope="col" className={HEAD}>
                        NIT
                    </th>
                    <th scope="col" className={HEAD}>
                        Contacto
                    </th>
                    <th scope="col" className={HEAD}>
                        Teléfono
                    </th>
                    <th scope="col" className={HEAD}>
                        Correo
                    </th>
                    {showBranch && (
                        <th scope="col" className={HEAD}>
                            Sucursal
                        </th>
                    )}
                    <th scope="col" className={HEAD}>
                        Estado
                    </th>
                    <th scope="col" className="w-16 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {suppliers.map((supplier) => (
                    <tr
                        key={supplier.id}
                        onClick={() => router.visit(route('suppliers.show', supplier.id))}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <SupplierAvatar name={supplier.name} />
                                <Link
                                    href={route('suppliers.show', supplier.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    className="min-w-0 truncate font-medium hover:underline"
                                >
                                    {supplier.name}
                                </Link>
                            </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap text-muted-foreground">{supplier.nit || '—'}</td>
                        <td className="px-3 py-3 text-muted-foreground">{supplier.contact_name || '—'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {supplier.phone ? (
                                <a
                                    href={`tel:${supplier.phone}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="hover:text-foreground hover:underline"
                                >
                                    {supplier.phone}
                                </a>
                            ) : (
                                '—'
                            )}
                        </td>
                        <td className="max-w-56 truncate px-3 py-3 text-muted-foreground">{supplier.email || '—'}</td>
                        {showBranch && <td className="px-3 py-3 text-muted-foreground">{supplier.branch?.name ?? '—'}</td>}
                        <td className="px-3 py-3">
                            <SupplierStatusPill active={supplier.status} />
                        </td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end">
                                <Link
                                    href={route('suppliers.show', supplier.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Ver proveedor ${supplier.name}`}
                                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground opacity-60 group-hover:opacity-100 hover:bg-muted hover:text-foreground"
                                >
                                    <Eye className="size-4" aria-hidden="true" />
                                </Link>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
