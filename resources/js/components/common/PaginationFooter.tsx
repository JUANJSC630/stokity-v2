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

export default function PaginationFooter({ data }: PaginationFooterProps) {
    if (!data || !Array.isArray(data.data) || data.data.length === 0) return null;

    const resourceLabel = data.resourceLabel || 'registros';

    return (
        <div className="mt-4 flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
                Mostrando {data.from} a {data.to} de {data.total} {resourceLabel}
            </div>
            <div className="flex items-center gap-1">
                {data.links.map((link, i) => {
                    const isFirst = i === 0;
                    const isLast = i === data.links.length - 1;
                    const isActive = i === data.current_page;
                    if (link.url === null) {
                        return (
                            <Button key={i} variant="ghost" size="icon" disabled className="size-8">
                                {isFirst ? <ChevronLeft className="size-4" /> : isLast ? <ChevronRight className="size-4" /> : link.label}
                            </Button>
                        );
                    }
                    let label = link.label;
                    if (isFirst || isLast) {
                        label = '';
                    }
                    return (
                        <Button
                            key={i}
                            variant={isActive ? 'default' : 'ghost'}
                            size={isFirst || isLast ? 'icon' : 'default'}
                            className={isFirst || isLast ? 'size-8' : 'size-8 px-3'}
                            onClick={() => {
                                if (link.url) {
                                    // Ensure HTTPS if the current page is HTTPS
                                    const url = window.location.protocol === 'https:' 
                                        ? link.url.replace(/^http:/, 'https:') 
                                        : link.url;
                                    
                                    router.visit(url, {
                                        preserveState: true,
                                        preserveScroll: true,
                                    });
                                }
                            }}
                        >
                            {isFirst ? <ChevronLeft className="size-4" /> : isLast ? <ChevronRight className="size-4" /> : label}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
