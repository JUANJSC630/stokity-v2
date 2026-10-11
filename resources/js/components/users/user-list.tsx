import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye } from 'lucide-react';
import { RoleBadge, UserAvatar, UserStatusPill } from './user-meta';

interface UserListProps {
    users: User[];
}

const active = (user: User) => Boolean(user.status);

/** Phones: a tappable row per user; swipe (or the row menu) to open it. */
export function UserCards({ users }: UserListProps) {
    return (
        <SwipeActions label={`${users.length} usuario(s)`}>
            {users.map((user, index) => (
                <SwipeActionsRow
                    key={user.id}
                    label={user.name}
                    fullSwipe={false}
                    trailing={[
                        { label: 'Ver', icon: <Eye />, tone: 'accent' as const, onSelect: () => router.visit(`/users/${user.id}`), keepRow: true },
                    ]}
                >
                    <StaggerItem index={index}>
                        <Link href={`/users/${user.id}`} aria-label={`Ver detalle de ${user.name}`} className="flex min-w-0 items-center gap-3">
                            <UserAvatar name={user.name} photoUrl={user.photo_url} />
                            <span className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="truncate text-[15px] leading-tight font-semibold">{user.name}</span>
                                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                                <span className="flex flex-wrap items-center gap-1.5">
                                    <RoleBadge role={user.role} className="px-2 py-0.5" />
                                    {!active(user) && <UserStatusPill active={false} className="px-2 py-0.5" />}
                                    <span className="text-xs text-muted-foreground">{user.branch?.name || 'Sin sucursal'}</span>
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

/** Desktop: a table whose rows open the user. */
export function UserTable({ users }: UserListProps) {
    return (
        <table className="w-full text-sm" aria-label="Usuarios">
            <caption className="sr-only">Usuarios</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Usuario
                    </th>
                    <th scope="col" className={HEAD}>
                        Email
                    </th>
                    <th scope="col" className={HEAD}>
                        Rol
                    </th>
                    <th scope="col" className={HEAD}>
                        Estado
                    </th>
                    <th scope="col" className={HEAD}>
                        Sucursal
                    </th>
                    <th scope="col" className="w-16 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {users.map((user) => (
                    <tr
                        key={user.id}
                        onClick={() => router.visit(`/users/${user.id}`)}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                    >
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <UserAvatar name={user.name} photoUrl={user.photo_url} />
                                <Link
                                    href={`/users/${user.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    className="min-w-0 truncate font-medium hover:underline"
                                >
                                    {user.name}
                                </Link>
                            </div>
                        </td>
                        <td className="max-w-64 truncate px-3 py-3 text-muted-foreground">{user.email}</td>
                        <td className="px-3 py-3">
                            <RoleBadge role={user.role} />
                        </td>
                        <td className="px-3 py-3">
                            <UserStatusPill active={active(user)} />
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{user.branch?.name || '-'}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end">
                                <Link
                                    href={`/users/${user.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    title="Ver Usuario"
                                    aria-label={`Ver usuario ${user.name}`}
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
