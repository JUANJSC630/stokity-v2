import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { type Branch } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { BranchAvatar, BranchStatusPill, sellersLabel } from './branch-meta';

interface BranchListProps {
    branches: Branch[];
}

/** Phones: a tappable row per branch; swipe (or the row menu) to open it. */
export function BranchCards({ branches }: BranchListProps) {
    return (
        <SwipeActions label={`${branches.length} sucursal(es)`}>
            {branches.map((branch, index) => (
                <SwipeActionsRow
                    key={branch.id}
                    label={branch.name}
                    fullSwipe={false}
                    trailing={[
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(`/branches/${branch.id}`),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={`/branches/${branch.id}`} aria-label="Ver detalle" className="flex min-w-0 items-center gap-3">
                            <BranchAvatar />
                            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <span className="flex items-center justify-between gap-2">
                                    <span className="min-w-0 truncate text-[15px] leading-tight font-semibold">{branch.name}</span>
                                    {!branch.status && <BranchStatusPill active={false} className="px-2 py-0.5" />}
                                </span>
                                <span className="truncate text-xs text-muted-foreground">{branch.address}</span>
                                <span className="truncate text-xs text-muted-foreground">
                                    {branch.phone} · {branch.manager ? branch.manager.name : 'Sin gerente'} · {sellersLabel(branch)}
                                </span>
                            </span>
                        </Link>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

const HEAD = 'px-3 py-3 font-medium';

/** Desktop: a table whose rows open the branch. */
export function BranchTable({ branches }: BranchListProps) {
    return (
        <table className="w-full text-sm" aria-label="Sucursales">
            <caption className="sr-only">Sucursales</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Nombre
                    </th>
                    <th scope="col" className={HEAD}>
                        Dirección
                    </th>
                    <th scope="col" className={HEAD}>
                        Teléfono
                    </th>
                    <th scope="col" className={HEAD}>
                        Estado
                    </th>
                    <th scope="col" className={HEAD}>
                        Gerente
                    </th>
                    <th scope="col" className={HEAD}>
                        Empleados
                    </th>
                    <th scope="col" className="w-16 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {branches.map((branch) => (
                    <tr
                        key={branch.id}
                        onClick={() => router.visit(`/branches/${branch.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <BranchAvatar />
                                <Link
                                    href={`/branches/${branch.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="min-w-0 truncate font-medium hover:underline"
                                >
                                    {branch.name}
                                </Link>
                            </div>
                        </td>
                        <td className="max-w-56 truncate px-3 py-3 text-muted-foreground">{branch.address}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{branch.phone}</td>
                        <td className="px-3 py-3">
                            <BranchStatusPill active={branch.status} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{branch.manager ? <span>{branch.manager.name}</span> : '-'}</td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">{sellersLabel(branch)}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end">
                                <Link
                                    href={`/branches/${branch.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    title="Ver Sucursal"
                                    aria-label={`Ver sucursal ${branch.name}`}
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
