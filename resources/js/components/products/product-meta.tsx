import { cn } from '@/lib/utils';
import { type Product } from '@/types';
import { Package, Wrench } from 'lucide-react';

export type ProductLike = Pick<Product, 'type' | 'stock' | 'min_stock'>;

/** A service has no stock; a product is low when it has the minimum or less. */
export const isLowStock = (product: ProductLike): boolean => product.type !== 'servicio' && product.stock <= product.min_stock;

export function TypePill({ type, className }: { type: string; className?: string }) {
    const isService = type === 'servicio';
    const Icon = isService ? Wrench : Package;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
                isService
                    ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                    : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
                className,
            )}
        >
            <Icon className="size-3.5" aria-hidden="true" />
            {isService ? 'Servicio' : 'Producto'}
        </span>
    );
}

export function StatusPill({ active, className }: { active: boolean; className?: string }) {
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

/** The stock figure alone in its element: red when low so the number itself carries the alert. */
export function StockFigure({ product, className }: { product: ProductLike; className?: string }) {
    if (product.type === 'servicio') {
        return <span className={cn('text-muted-foreground', className)}>—</span>;
    }

    return isLowStock(product) ? (
        <span
            className={cn(
                'inline-flex min-w-8 items-center justify-center rounded-md bg-red-100 px-2 py-0.5 text-sm font-semibold text-red-700 tabular-nums dark:bg-red-950/50 dark:text-red-300',
                className,
            )}
        >
            {product.stock}
        </span>
    ) : (
        <span className={cn('tabular-nums', className)}>{product.stock}</span>
    );
}

/** Product photo with a graceful placeholder while it loads or when the address is empty. */
export function ProductThumb({ src, name, size = 'md', className }: { src?: string | null; name: string; size?: 'md' | 'lg'; className?: string }) {
    return (
        <span
            className={cn(
                'relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/60 bg-muted text-muted-foreground',
                size === 'lg' ? 'size-14' : 'size-11',
                className,
            )}
        >
            <Package className="size-5" aria-hidden="true" />
            {src && <img src={src} alt={name} loading="lazy" className="absolute inset-0 size-full object-cover" />}
        </span>
    );
}
