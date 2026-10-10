import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { FileText, MoveRight } from 'lucide-react';
import { useState } from 'react';
import { MovementMarker, MovementTypePill, formatMovementDate, signedQuantity, typeStyle } from './stock-meta';

export interface MovementRow {
    id: number;
    type: string;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_cost: number | null;
    reference: string | null;
    notes: string | null;
    movement_date: string;
    product?: { id: number; name: string; code: string; deleted_at: string | null } | null;
    user: { id: number; name: string };
    branch?: { id: number; name: string } | null;
}

interface MovementListProps {
    movements: MovementRow[];
    /** The global list names the product of each movement; the history of one product does not. */
    showProduct: boolean;
}

const quantityTone = (type: string) => {
    const { sign } = typeStyle(type);
    return sign > 0 ? 'text-emerald-600 dark:text-emerald-400' : sign < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
};

function StockChange({ previous, next }: { previous: number; next: number }) {
    return (
        <span className="inline-flex items-center gap-1.5 tabular-nums">
            <span className="text-muted-foreground">{previous.toLocaleString()}</span>
            <MoveRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="font-semibold">{next.toLocaleString()}</span>
        </span>
    );
}

function ProductName({ movement, className }: { movement: MovementRow; className?: string }) {
    const product = movement.product;
    if (!product) {
        return <span className={cn('text-muted-foreground italic', className)}>Producto eliminado</span>;
    }
    if (product.deleted_at) {
        return (
            <span className={cn('text-muted-foreground italic', className)}>
                {product.code} - {product.name} (eliminado)
            </span>
        );
    }
    return (
        <Link href={`/products/${product.id}`} className={cn('hover:underline', className)}>
            {product.code} - {product.name}
        </Link>
    );
}

/** A note that fits stays in place; a long one is cut and opens in a dialog. */
export function NoteCell({ note, lines = 1 }: { note: string; lines?: 1 | 2 | 3 }) {
    const [open, setOpen] = useState(false);
    const isLong = note.length > 60;

    return (
        <>
            <div className="flex items-start gap-1">
                <span
                    className={cn('min-w-0 break-words', lines === 1 ? 'max-w-[180px] truncate' : lines === 2 ? 'line-clamp-2' : 'line-clamp-3')}
                    title={isLong ? undefined : note}
                >
                    {note}
                </span>
                {isLong && (
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="-my-1 flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Ver nota completa"
                    >
                        <FileText className="size-4" aria-hidden="true" />
                    </button>
                )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nota del movimiento</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{note}</p>
                </DialogContent>
            </Dialog>
        </>
    );
}

/** Phones: one card per movement with the quantity signed and the stock before and after. */
export function MovementCards({ movements, showProduct }: MovementListProps) {
    return (
        <ul className="divide-y divide-border/40" aria-label={`${movements.length} movimiento(s)`}>
            {movements.map((movement) => (
                <li key={movement.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start gap-3">
                        <MovementMarker type={movement.type} />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                                {showProduct ? (
                                    <span className="min-w-0 text-[15px] leading-tight font-semibold">
                                        <ProductName movement={movement} />
                                    </span>
                                ) : (
                                    <MovementTypePill type={movement.type} />
                                )}
                                <span className={cn('shrink-0 text-[17px] font-bold tabular-nums', quantityTone(movement.type))}>
                                    {signedQuantity(movement.type, movement.quantity)}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {showProduct && <MovementTypePill type={movement.type} className="px-2 py-0.5" />}
                                <span className="inline-flex items-center gap-1">
                                    Stock <StockChange previous={movement.previous_stock} next={movement.new_stock} />
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {formatMovementDate(movement.movement_date)} · {movement.user.name}
                                {movement.branch?.name ? ` · ${movement.branch.name}` : ''}
                            </p>
                        </div>
                    </div>
                    {(movement.reference || movement.unit_cost || movement.notes) && (
                        <div className="flex flex-col gap-1.5 rounded-xl bg-muted/50 p-3 text-xs">
                            {movement.reference && (
                                <p>
                                    <span className="text-muted-foreground">Referencia: </span>
                                    <span className="font-medium">{movement.reference}</span>
                                </p>
                            )}
                            {movement.unit_cost ? (
                                <p>
                                    <span className="text-muted-foreground">Costo unitario: </span>
                                    <span className="font-medium">{formatCurrency(Number(movement.unit_cost))}</span>
                                </p>
                            ) : null}
                            {movement.notes && <NoteCell note={movement.notes} lines={2} />}
                        </div>
                    )}
                </li>
            ))}
        </ul>
    );
}

const HEAD = 'px-3 py-3 font-medium';

/** Desktop: a table with the signed quantity, the stock change, cost, reference and who did it. */
export function MovementTable({ movements, showProduct, caption }: MovementListProps & { caption: string }) {
    return (
        <table className="w-full text-sm" aria-label={caption}>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    <th scope="col" className="px-6 py-3 font-medium">
                        Fecha
                    </th>
                    {showProduct && (
                        <th scope="col" className={HEAD}>
                            Producto
                        </th>
                    )}
                    <th scope="col" className={HEAD}>
                        Tipo
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Cantidad
                    </th>
                    <th scope="col" className={HEAD}>
                        Stock
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Costo Unit.
                    </th>
                    <th scope="col" className={HEAD}>
                        Referencia
                    </th>
                    <th scope="col" className={HEAD}>
                        Usuario
                    </th>
                    <th scope="col" className={cn(HEAD, 'pr-6')}>
                        {showProduct ? 'Sucursal' : 'Notas'}
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {movements.map((movement) => (
                    <tr key={movement.id} className="transition-colors hover:bg-muted/40">
                        <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">{formatMovementDate(movement.movement_date)}</td>
                        {showProduct && (
                            <td className="max-w-[16rem] px-3 py-3">
                                <span className="line-clamp-2 font-medium">
                                    <ProductName movement={movement} />
                                </span>
                            </td>
                        )}
                        <td className="px-3 py-3">
                            <MovementTypePill type={movement.type} />
                        </td>
                        <td className={cn('px-3 py-3 text-right font-semibold tabular-nums', quantityTone(movement.type))}>
                            {signedQuantity(movement.type, movement.quantity)}
                        </td>
                        <td className="px-3 py-3">
                            <StockChange previous={movement.previous_stock} next={movement.new_stock} />
                        </td>
                        <td className="px-3 py-3 text-right whitespace-nowrap tabular-nums">
                            {movement.unit_cost ? formatCurrency(Number(movement.unit_cost)) : '-'}
                        </td>
                        <td className="max-w-[10rem] px-3 py-3">
                            {movement.reference ? (
                                <span className="block truncate" title={movement.reference}>
                                    {movement.reference}
                                </span>
                            ) : (
                                '-'
                            )}
                        </td>
                        <td className="px-3 py-3">{movement.user.name}</td>
                        <td className="px-3 py-3 pr-6">
                            {showProduct ? (movement.branch?.name ?? '—') : movement.notes ? <NoteCell note={movement.notes} /> : '-'}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
