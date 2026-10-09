import { initialsOf } from '@/components/admin/tenant-badges';
import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { type Client } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye, Mail, Phone } from 'lucide-react';

interface ClientListProps {
    clients: Client[];
}

function WholesalePill({ client }: { client: Client }) {
    if (!client.is_wholesale) return null;

    return (
        <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
            Mayorista{client.wholesale_discount_pct ? ` ${Number(client.wholesale_discount_pct)}%` : ''}
        </span>
    );
}

function Avatar({ name }: { name: string }) {
    return (
        <span
            aria-hidden="true"
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-primary-soft)] text-sm font-semibold text-[var(--brand-primary)]"
        >
            {initialsOf(name) || '?'}
        </span>
    );
}

/** Phones: tappable rows with call and open actions under a swipe. */
export function ClientCards({ clients }: ClientListProps) {
    return (
        <SwipeActions label={`${clients.length} cliente(s)`}>
            {clients.map((client, index) => (
                <SwipeActionsRow
                    key={client.id}
                    label={client.name}
                    fullSwipe={false}
                    trailing={[
                        ...(client.phone
                            ? [
                                  {
                                      label: 'Llamar',
                                      icon: <Phone />,
                                      tone: 'neutral' as const,
                                      onSelect: () => window.location.assign(`tel:${client.phone}`),
                                      keepRow: true,
                                  },
                              ]
                            : []),
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(route('clients.show', client.id)),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={route('clients.show', client.id)} className="flex min-w-0 items-center gap-3">
                            <Avatar name={client.name} />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center gap-2">
                                    <span className="min-w-0 truncate text-[15px] leading-tight font-semibold">{client.name}</span>
                                    <WholesalePill client={client} />
                                </span>
                                <span className="truncate text-xs text-muted-foreground">{client.document || 'Sin documento'}</span>
                                {(client.phone || client.email) && (
                                    <span className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {client.phone && (
                                            <span className="flex min-w-0 items-center gap-1">
                                                <Phone className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{client.phone}</span>
                                            </span>
                                        )}
                                        {client.email && (
                                            <span className="flex min-w-0 items-center gap-1">
                                                <Mail className="size-3 shrink-0" aria-hidden="true" />
                                                <span className="truncate">{client.email}</span>
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

/** Tablets and desktops: a dense table whose rows open the client. */
export function ClientTable({ clients }: ClientListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Clientes</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Cliente
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Documento
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Teléfono
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Correo
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Dirección
                    </th>
                    <th scope="col" className="w-16 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {clients.map((client) => (
                    <tr
                        key={client.id}
                        onClick={() => router.visit(route('clients.show', client.id))}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <Avatar name={client.name} />
                                <div className="flex min-w-0 items-center gap-2">
                                    <Link
                                        href={route('clients.show', client.id)}
                                        onClick={(event) => event.stopPropagation()}
                                        className="truncate font-medium hover:underline"
                                    >
                                        {client.name}
                                    </Link>
                                    <WholesalePill client={client} />
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{client.document || '—'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">
                            {client.phone ? (
                                <a
                                    href={`tel:${client.phone}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="hover:text-foreground hover:underline"
                                >
                                    {client.phone}
                                </a>
                            ) : (
                                '—'
                            )}
                        </td>
                        <td className="max-w-56 truncate px-3 py-3 text-muted-foreground">{client.email || '—'}</td>
                        <td className="max-w-56 truncate px-3 py-3 text-muted-foreground">{client.address || '—'}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end">
                                <Link
                                    href={route('clients.show', client.id)}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Ver cliente ${client.name}`}
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
