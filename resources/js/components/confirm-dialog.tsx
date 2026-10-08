import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type ReactNode, useCallback, useRef, useState } from 'react';

export interface ConfirmOptions {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
}

/**
 * Replaces the browser's native `confirm()`: it follows the app theme, traps focus,
 * closes with Escape and can be read by screen readers.
 *
 * const { confirm, dialog } = useConfirm();
 * if (await confirm({ title: '¿Eliminar?', destructive: true })) { ... }
 * return <>{...}{dialog}</>;
 */
export function useConfirm(): { confirm: (options: ConfirmOptions) => Promise<boolean>; dialog: ReactNode } {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const resolver = useRef<((accepted: boolean) => void) | null>(null);

    const confirm = useCallback(
        (next: ConfirmOptions) =>
            new Promise<boolean>((resolve) => {
                resolver.current?.(false);
                resolver.current = resolve;
                setOptions(next);
            }),
        [],
    );

    const settle = (accepted: boolean) => {
        resolver.current?.(accepted);
        resolver.current = null;
        setOptions(null);
    };

    const dialog = (
        <Dialog open={options !== null} onOpenChange={(open) => !open && settle(false)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{options?.title}</DialogTitle>
                    {options?.description && <DialogDescription>{options.description}</DialogDescription>}
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => settle(false)}>
                        {options?.cancelLabel ?? 'Cancelar'}
                    </Button>
                    <Button type="button" variant={options?.destructive === false ? 'default' : 'destructive'} onClick={() => settle(true)}>
                        {options?.confirmLabel ?? 'Confirmar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );

    return { confirm, dialog };
}
