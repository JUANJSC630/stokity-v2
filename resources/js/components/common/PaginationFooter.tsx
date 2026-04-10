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

    // Build a windowed subset for mobile: show at most 5 pages centered on current
    const mobileWindow = ((): typeof pageLinks => {
        if (pageLinks.length <= 5) return pageLinks;
        const idx = pageLinks.findIndex((_, i) => i + 1 === cur);
        const start = Math.max(0, Math.min(idx - 2, pageLinks.length - 5));
        return pageLinks.slice(start, start + 5);
    })();

    return (
        <div className="mt-4 flex flex-col items-center gap-3 p-4 sm:flex-row sm:justify-between">
            {/* Info text */}
            <p className="text-sm text-muted-foreground">
                Mostrando {data.from} a {data.to} de {data.total} {resourceLabel}
            </p>

            {/* Pagination buttons */}
            <div className="flex items-center gap-1">
                {/* Prev */}
                <Button variant="ghost" size="icon" disabled={!prevUrl} className="size-8" onClick={() => navigate(prevUrl)}>
                    <ChevronLeft className="size-4" />
                </Button>

                {/* Mobile: windowed pages (≤5) */}
                <div className="flex items-center gap-1 sm:hidden">
                    {mobileWindow[0] && pageLinks.indexOf(mobileWindow[0]) > 0 && (
                        <>
                            <Button
                                variant={cur === 1 ? 'default' : 'ghost'}
                                size="default"
                                className="size-8 px-3"
                                onClick={() => navigate(pageLinks[0].url)}
                            >
                                1
                            </Button>
                            {pageLinks.indexOf(mobileWindow[0]) > 1 && (
                                <span className="px-1 text-xs text-muted-foreground">…</span>
                            )}
                        </>
                    )}
                    {mobileWindow.map((link, i) => {
                        const pageNum = pageLinks.indexOf(link) + 1;
                        const isActive = pageNum === cur;
                        return (
                            <Button
                                key={i}
                                variant={isActive ? 'default' : 'ghost'}
                                size="default"
                                className="size-8 px-3"
                                onClick={() => navigate(link.url)}
                                disabled={!link.url}
                            >
                                {link.label}
                            </Button>
                        );
                    })}
                    {(() => {
                        const lastInWindow = mobileWindow[mobileWindow.length - 1];
                        const lastInWindowIdx = lastInWindow ? pageLinks.indexOf(lastInWindow) : -1;
                        if (lastInWindowIdx < pageLinks.length - 1) {
                            return (
                                <>
                                    {lastInWindowIdx < pageLinks.length - 2 && (
                                        <span className="px-1 text-xs text-muted-foreground">…</span>
                                    )}
                                    <Button
                                        variant={cur === last ? 'default' : 'ghost'}
                                        size="default"
                                        className="size-8 px-3"
                                        onClick={() => navigate(pageLinks[pageLinks.length - 1].url)}
                                    >
                                        {last}
                                    </Button>
                                </>
                            );
                        }
                        return null;
                    })()}
                </div>

                {/* Desktop: all pages */}
                <div className="hidden items-center gap-1 sm:flex">
                    {pageLinks.map((link, i) => {
                        const pageNum = i + 1;
                        const isActive = pageNum === cur;
                        return (
                            <Button
                                key={i}
                                variant={isActive ? 'default' : 'ghost'}
                                size="default"
                                className="size-8 px-3"
                                onClick={() => navigate(link.url)}
                                disabled={!link.url}
                            >
                                {link.label}
                            </Button>
                        );
                    })}
                </div>

                {/* Next */}
                <Button variant="ghost" size="icon" disabled={!nextUrl} className="size-8" onClick={() => navigate(nextUrl)}>
                    <ChevronRight className="size-4" />
                </Button>
            </div>
        </div>
    );
}
