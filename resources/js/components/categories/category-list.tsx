import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Category } from '@/types';
import { Tag } from 'lucide-react';
import { type ReactNode } from 'react';

export interface CategoryAction {
    label: string;
    icon: ReactNode;
    tone?: 'neutral' | 'accent' | 'danger';
    onSelect: () => void;
}

interface CategoryListProps {
    categories: Category[];
    actions: (category: Category) => CategoryAction[];
    /** What the date column is about, e.g. "Creada" or "Eliminada". */
    dateLabel: string;
    dateOf: (category: Category) => string | null;
    /** Phones: buttons under each row instead of swipe actions (for the trash, where the actions are the whole point). */
    visibleActions?: boolean;
    /** Show the active/inactive state (not meaningful for deleted categories). */
    showStatus?: boolean;
}

function Marker({ muted }: { muted: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-xl',
                muted ? 'bg-muted text-muted-foreground' : 'bg-[var(--brand-primary-soft)] text-[var(--brand-primary)]',
            )}
        >
            <Tag className="size-5" />
        </span>
    );
}

function InactivePill() {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-muted-foreground/60" />
            Inactiva
        </span>
    );
}

function CardBody({
    category,
    dateLabel,
    dateOf,
    showStatus,
}: Pick<CategoryListProps, 'dateLabel' | 'dateOf' | 'showStatus'> & { category: Category }) {
    return (
        <span className="flex min-w-0 flex-1 items-center gap-3">
            <Marker muted={!category.status || !showStatus} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] leading-tight font-semibold">{category.name}</span>
                {category.description && <span className="line-clamp-1 text-xs text-muted-foreground">{category.description}</span>}
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>
                        {dateLabel} {formatDate(dateOf(category))}
                    </span>
                    {showStatus && !category.status && <InactivePill />}
                </span>
            </span>
        </span>
    );
}

const actionButton = (tone?: CategoryAction['tone']) =>
    cn(
        'flex h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors',
        tone === 'danger'
            ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40'
            : 'border-border/60 hover:bg-muted',
    );

/** Phones: a tappable row per category; swipe (or the row menu) for its actions, or visible buttons under each row. */
export function CategoryCards({ categories, actions, dateLabel, dateOf, visibleActions = false, showStatus = true }: CategoryListProps) {
    if (visibleActions) {
        return (
            <ul className="divide-y divide-border/40" aria-label={`${categories.length} categoría(s)`}>
                {categories.map((category) => (
                    <li key={category.id} className="flex flex-col gap-3 p-4">
                        <CardBody category={category} dateLabel={dateLabel} dateOf={dateOf} showStatus={showStatus} />
                        <div className="flex justify-end gap-2">
                            {actions(category).map((action) => (
                                <button
                                    key={action.label}
                                    type="button"
                                    aria-label={action.label}
                                    onClick={action.onSelect}
                                    className={cn(actionButton(action.tone), action.tone === 'danger' ? 'w-11 px-0' : '')}
                                >
                                    <span aria-hidden="true" className="[&>svg]:size-4">
                                        {action.icon}
                                    </span>
                                    {action.tone === 'danger' ? null : action.label}
                                </button>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        );
    }

    return (
        <SwipeActions label={`${categories.length} categoría(s)`}>
            {categories.map((category, index) => (
                <SwipeActionsRow
                    key={category.id}
                    label={category.name}
                    fullSwipe={false}
                    trailing={actions(category).map((action) => ({ ...action, keepRow: true }))}
                >
                    <StaggerItem index={index}>
                        <CardBody category={category} dateLabel={dateLabel} dateOf={dateOf} showStatus={showStatus} />
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

/** Desktop: a table with the description, state and date, and the actions on hover. */
export function CategoryTable({ categories, actions, dateLabel, dateOf, showStatus = true }: CategoryListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Categorías</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Nombre
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                        Descripción
                    </th>
                    {showStatus && (
                        <th scope="col" className="px-3 py-3 font-medium">
                            Estado
                        </th>
                    )}
                    <th scope="col" className="px-3 py-3 font-medium">
                        {dateLabel}
                    </th>
                    <th scope="col" className="w-32 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {categories.map((category) => (
                    <tr key={category.id} className="group transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                                <Marker muted={!category.status || !showStatus} />
                                <span className="min-w-0 truncate font-medium">{category.name}</span>
                            </div>
                        </td>
                        <td className="max-w-xs px-3 py-3 text-muted-foreground">
                            <span className="line-clamp-1">{category.description || '—'}</span>
                        </td>
                        {showStatus && (
                            <td className="px-3 py-3">
                                {category.status ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                        <span aria-hidden="true" className="size-1.5 rounded-full bg-emerald-500" />
                                        Activa
                                    </span>
                                ) : (
                                    <InactivePill />
                                )}
                            </td>
                        )}
                        <td className="px-3 py-3 whitespace-nowrap text-muted-foreground">{formatDate(dateOf(category))}</td>
                        <td className="px-6 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                {actions(category).map((action) => (
                                    <button
                                        key={action.label}
                                        type="button"
                                        aria-label={action.label}
                                        title={action.label}
                                        onClick={action.onSelect}
                                        className={cn(
                                            'flex size-9 items-center justify-center rounded-lg hover:bg-muted [&>svg]:size-4',
                                            action.tone === 'danger'
                                                ? 'text-red-500 hover:text-red-600'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {action.icon}
                                    </button>
                                ))}
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
