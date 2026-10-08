import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationData {
    data: unknown[];
    links: { label: string; url: string | null }[];
    current_page: number;
    from: number;
    to: number;
    total: number;
    last_page: number;
    /** Optional: label for the resource, e.g. 'ventas', 'usuarios', etc. */
    resourceLabel?: string;
}

interface PaginationFooterProps {
    data: PaginationData;
}

function navigate(url: string | null) {
    if (!url) return;
    const safe = window.location.protocol === 'https:' ? url.replace(/^http:/, 'https:') : url;
    router.visit(safe, { preserveState: true, preserveScroll: true });
}

export default function PaginationFooter({ data }: PaginationFooterProps) {
    if (!data || !Array.isArray(data.data) || data.data.length === 0) return null;

    const resourceLabel = data.resourceLabel || 'registros';
    const { current_page: cur, last_page: last, links } = data;

    // Extract prev / next URLs from links (first = prev, last = next)
    const prevUrl = links[0]?.url ?? null;
    const nextUrl = links[links.length - 1]?.url ?? null;

    // Page links (exclude first «prev» and last «next» items)
    const pageLinks = links.slice(1, -1);

    return (
        <div className="mt-4 flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Info text */}
            <p className="order-2 text-center text-xs text-muted-foreground sm:order-none sm:text-left sm:text-sm">
                Mostrando {data.from} a {data.to} de {data.total} {resourceLabel}
            </p>

            {/* Phones: big previous / next with the page position, instead of a row of tiny page numbers */}
            {last > 1 && (
                <nav aria-label="Paginación" className="order-1 flex items-center justify-between gap-2 sm:hidden">
                    <Button
                        aria-label="Anterior"
                        variant="outline"
                        disabled={!prevUrl}
                        className="h-11 flex-1 gap-1"
                        onClick={() => navigate(prevUrl)}
                    >
                        <ChevronLeft className="size-4" />
                        Anterior
                    </Button>
                    <p className="shrink-0 px-2 text-sm font-medium tabular-nums" aria-live="polite">
                        {cur} / {last}
                    </p>
                    <Button
                        aria-label="Siguiente"
                        variant="outline"
                        disabled={!nextUrl}
                        className="h-11 flex-1 gap-1"
                        onClick={() => navigate(nextUrl)}
                    >
                        Siguiente
                        <ChevronRight className="size-4" />
                    </Button>
                </nav>
            )}

            {/* Tablets and up: previous, every page, next */}
            <nav aria-label="Paginación" className="hidden items-center gap-1 sm:flex">
                <Button aria-label="Anterior" variant="ghost" size="icon" disabled={!prevUrl} className="size-8" onClick={() => navigate(prevUrl)}>
                    <ChevronLeft className="size-4" />
                </Button>
                {pageLinks.map((link, i) => {
                    const isActive = i + 1 === cur;
                    return (
                        <Button
                            key={i}
                            variant={isActive ? 'default' : 'ghost'}
                            size="default"
                            className="size-8 px-3"
                            aria-current={isActive ? 'page' : undefined}
                            onClick={() => navigate(link.url)}
                            disabled={!link.url}
                        >
                            {link.label}
                        </Button>
                    );
                })}
                <Button aria-label="Siguiente" variant="ghost" size="icon" disabled={!nextUrl} className="size-8" onClick={() => navigate(nextUrl)}>
                    <ChevronRight className="size-4" />
                </Button>
            </nav>
        </div>
    );
}
