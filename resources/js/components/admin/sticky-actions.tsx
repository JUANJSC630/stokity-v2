import type { ReactNode } from 'react';

/**
 * Form actions that stay in view above the phone bottom bar while a long form is
 * scrolled, and sit in the normal flow from md. Needs an ancestor that does not
 * clip overflow-x with `hidden` (that would make it a scroll container), which
 * is why the app layout uses `overflow-x-clip`.
 */
export function StickyActions({ children }: { children: ReactNode }) {
    return (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-4 flex items-center justify-end gap-2 border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 md:static md:z-auto md:mx-0 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
            {children}
        </div>
    );
}
