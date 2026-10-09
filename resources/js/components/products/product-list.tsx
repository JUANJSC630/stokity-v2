import { SwipeActions, SwipeActionsRow } from '@/components/ui/arc/swipe-actions';
import { StaggerItem } from '@/components/ui/bencho/stagger-item';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import { Link, router } from '@inertiajs/react';
import { Eye, Pencil } from 'lucide-react';
import { ProductThumb, StatusPill, StockFigure, TypePill } from './product-meta';

interface ProductListProps {
    products: Product[];
    /** Rows can be ticked to print their labels. */
    selectable: boolean;
    selectedIds: Set<number>;
    onToggle: (id: number) => void;
    busy: boolean;
    showBranch: boolean;
    canEdit: boolean;
}

/** What the customer pays: the price, or "Variable" for a service that is quoted on each sale. */
export const priceLabel = (product: Product): string =>
    product.type === 'servicio' && product.variable_price ? 'Variable' : formatCurrency(Number(product.sale_price));

function SelectBox({ product, selected, onToggle, busy }: { product: Product; selected: boolean; onToggle: (id: number) => void; busy: boolean }) {
    return (
        <span className="flex size-11 shrink-0 items-center justify-center">
            <Checkbox
                checked={selected}
                onCheckedChange={() => onToggle(product.id)}
                disabled={busy}
                aria-label={`Seleccionar ${product.name} para imprimir etiqueta`}
                className="size-5"
            />
        </span>
    );
}

/** Phones: one tappable row per product; swipe (or the row menu) to open or edit it. */
export function ProductCards({ products, selectable, selectedIds, onToggle, busy, showBranch, canEdit }: ProductListProps) {
    return (
        <SwipeActions label={`${products.length} producto(s)`}>
            {products.map((product, index) => (
                <SwipeActionsRow
                    key={product.id}
                    label={product.name}
                    fullSwipe={false}
                    trailing={[
                        ...(canEdit
                            ? [
                                  {
                                      label: 'Editar',
                                      icon: <Pencil />,
                                      tone: 'neutral' as const,
                                      onSelect: () => router.visit(`/products/${product.id}/edit`),
                                      keepRow: true,
                                  },
                              ]
                            : []),
                        {
                            label: 'Ver',
                            icon: <Eye />,
                            tone: 'accent' as const,
                            onSelect: () => router.visit(`/products/${product.id}`),
                            keepRow: true,
                        },
                    ]}
                >
                    <StaggerItem index={index}>
                        <div className="flex min-w-0 items-center gap-1">
                            {selectable && <SelectBox product={product} selected={selectedIds.has(product.id)} onToggle={onToggle} busy={busy} />}
                            <Link href={`/products/${product.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                                <ProductThumb src={product.image_url} name={product.name} size="lg" />
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                    <span className="flex items-start justify-between gap-2">
                                        <span className="line-clamp-2 min-w-0 text-[15px] leading-tight font-semibold">{product.name}</span>
                                        <span className="shrink-0 text-[15px] font-bold tabular-nums">{priceLabel(product)}</span>
                                    </span>
                                    <span className="truncate text-xs text-muted-foreground">
                                        <span className="font-mono">{product.code}</span>
                                        {product.category?.name ? ` · ${product.category.name}` : ''}
                                        {showBranch && product.branch?.name ? ` · ${product.branch.name}` : ''}
                                    </span>
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                        {product.type === 'servicio' ? (
                                            <TypePill type="servicio" className="px-2 py-0.5" />
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5">
                                                Stock <StockFigure product={product} className="text-foreground" />
                                            </span>
                                        )}
                                        {!product.status && <StatusPill active={false} className="px-2 py-0.5" />}
                                    </span>
                                </span>
                            </Link>
                        </div>
                    </StaggerItem>
                </SwipeActionsRow>
            ))}
        </SwipeActions>
    );
}

const HEAD = 'px-3 py-3 font-medium';

/** Desktop: a table whose rows open the product, with edit and view shortcuts on hover. */
export function ProductTable({ products, selectable, selectedIds, onToggle, busy, showBranch, canEdit }: ProductListProps) {
    return (
        <table className="w-full text-sm">
            <caption className="sr-only">Catálogo de productos y servicios</caption>
            <thead>
                <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                    {selectable && (
                        <th scope="col" className="w-12 py-3 pl-6">
                            <span className="sr-only">Seleccionar</span>
                        </th>
                    )}
                    <th scope="col" className={cn(HEAD, selectable ? 'px-3' : 'px-6')}>
                        Producto
                    </th>
                    <th scope="col" className={HEAD}>
                        Categoría
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Precio
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-right')}>
                        Impuesto
                    </th>
                    <th scope="col" className={cn(HEAD, 'text-center')}>
                        Stock
                    </th>
                    <th scope="col" className={HEAD}>
                        Tipo
                    </th>
                    <th scope="col" className={HEAD}>
                        Estado
                    </th>
                    {showBranch && (
                        <th scope="col" className={HEAD}>
                            Sucursal
                        </th>
                    )}
                    <th scope="col" className="w-24 px-6 py-3">
                        <span className="sr-only">Acciones</span>
                    </th>
                </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
                {products.map((product) => (
                    <tr
                        key={product.id}
                        onClick={() => router.visit(`/products/${product.id}`)}
                        className={cn('group cursor-pointer transition-colors hover:bg-muted/40', selectedIds.has(product.id) && 'bg-muted/30')}
                    >
                        {selectable && (
                            <td className="py-2 pl-6" onClick={(event) => event.stopPropagation()}>
                                <SelectBox product={product} selected={selectedIds.has(product.id)} onToggle={onToggle} busy={busy} />
                            </td>
                        )}
                        <td className={cn('py-3', selectable ? 'px-3' : 'px-6')}>
                            <div className="flex items-center gap-3">
                                <ProductThumb src={product.image_url} name={product.name} />
                                <div className="min-w-0">
                                    <Link
                                        href={`/products/${product.id}`}
                                        onClick={(event) => event.stopPropagation()}
                                        className="block truncate font-medium hover:underline"
                                    >
                                        {product.name}
                                    </Link>
                                    <p className="font-mono text-xs text-muted-foreground">{product.code}</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{product.category?.name}</td>
                        <td className="px-3 py-3 text-right font-semibold whitespace-nowrap tabular-nums">{priceLabel(product)}</td>
                        <td className="px-3 py-3 text-right text-muted-foreground tabular-nums">{product.tax || 0}%</td>
                        <td className="px-3 py-3 text-center">
                            <StockFigure product={product} />
                        </td>
                        <td className="px-3 py-3">
                            <TypePill type={product.type} />
                        </td>
                        <td className="px-3 py-3">
                            <StatusPill active={product.status} />
                        </td>
                        {showBranch && <td className="px-3 py-3 text-muted-foreground">{product.branch?.name}</td>}
                        <td className="px-6 py-3">
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                {canEdit && (
                                    <Link
                                        href={`/products/${product.id}/edit`}
                                        onClick={(event) => event.stopPropagation()}
                                        aria-label={`Editar ${product.name}`}
                                        className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                                    >
                                        <Pencil className="size-4" aria-hidden="true" />
                                    </Link>
                                )}
                                <Link
                                    href={`/products/${product.id}`}
                                    onClick={(event) => event.stopPropagation()}
                                    aria-label={`Ver ${product.name}`}
                                    className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
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
