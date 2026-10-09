import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PullToRefresh } from '../pull-to-refresh';

class TestPointerEvent extends MouseEvent {
    pointerId: number;
    pointerType: string;

    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
        this.pointerType = init.pointerType ?? 'mouse';
    }
}

const MIN = 900;

beforeEach(() => {
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
});

const setup = (onRefresh: () => Promise<unknown> | void = vi.fn()) => {
    const utils = render(
        <PullToRefresh onRefresh={onRefresh} minDuration={MIN}>
            {({ refresh, refreshing }) => (
                <div>
                    <p>contenido</p>
                    <button type="button" onClick={refresh}>
                        actualizar
                    </button>
                    <span data-testid="state">{refreshing ? 'ocupado' : 'libre'}</span>
                </div>
            )}
        </PullToRefresh>,
    );
    const root = utils.container.firstElementChild as HTMLElement;
    const sheet = screen.getByText('contenido').parentElement?.parentElement as HTMLElement;

    return { ...utils, onRefresh, root, sheet };
};

function pull(sheet: HTMLElement, distance: number, { dx = 0 } = {}) {
    fireEvent.pointerDown(sheet, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(sheet, { pointerId: 1, pointerType: 'mouse', clientX: 100 + dx, clientY: 100 + distance / 2 });
    fireEvent.pointerMove(sheet, { pointerId: 1, pointerType: 'mouse', clientX: 100 + dx, clientY: 100 + distance });
    fireEvent.pointerUp(sheet, { pointerId: 1, pointerType: 'mouse', clientX: 100 + dx, clientY: 100 + distance });
}

describe('PullToRefresh', () => {
    it('refreshes when the sheet is pulled past the line', () => {
        const { sheet, root, onRefresh } = setup();

        pull(sheet, 400);

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(root).toHaveAttribute('data-phase', 'work');
        expect(screen.getByTestId('state')).toHaveTextContent('ocupado');
        expect(screen.getByRole('status')).toHaveTextContent('Actualizando…');
    });

    it('does nothing for a short pull', () => {
        const { sheet, root, onRefresh } = setup();

        pull(sheet, 20);

        expect(onRefresh).not.toHaveBeenCalled();
        expect(root).toHaveAttribute('data-phase', 'idle');
    });

    it('ignores an upward drag so the page can scroll', () => {
        const { sheet, onRefresh } = setup();

        pull(sheet, -300);

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('ignores a mostly horizontal drag', () => {
        const { sheet, onRefresh } = setup();

        pull(sheet, 30, { dx: 200 });

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('only starts when the page is scrolled to the top', () => {
        Object.defineProperty(window, 'scrollY', { configurable: true, value: 120 });
        const { sheet, onRefresh } = setup();

        pull(sheet, 400);

        expect(onRefresh).not.toHaveBeenCalled();
    });

    it('waits for the refresh to finish and for the minimum time before going back to rest', async () => {
        let finish: () => void = () => undefined;
        const onRefresh = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
        const { sheet, root } = setup(onRefresh);

        pull(sheet, 400);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(MIN + 200);
        });
        expect(root).toHaveAttribute('data-phase', 'work');

        await act(async () => {
            finish();
            await vi.advanceTimersByTimeAsync(MIN + 50);
        });

        expect(root).toHaveAttribute('data-phase', 'idle');
    });

    it('keeps the drops for the minimum time even when the data arrives at once', async () => {
        const { sheet, root } = setup(() => Promise.resolve());

        pull(sheet, 400);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(300);
        });
        expect(root).toHaveAttribute('data-phase', 'work');

        await act(async () => {
            await vi.advanceTimersByTimeAsync(MIN);
        });
        expect(root).toHaveAttribute('data-phase', 'idle');
    });

    it('returns to rest even when the refresh fails', async () => {
        const { sheet, root } = setup(() => Promise.reject(new Error('sin red')));

        pull(sheet, 400);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(MIN + 100);
        });

        expect(root).toHaveAttribute('data-phase', 'idle');
    });

    it('offers a refresh function for a visible button, and ignores it while already working', async () => {
        const { onRefresh } = setup();

        fireEvent.click(screen.getByRole('button', { name: 'actualizar' }));
        fireEvent.click(screen.getByRole('button', { name: 'actualizar' }));
        await act(async () => {
            await vi.advanceTimersByTimeAsync(0);
        });

        expect(onRefresh).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('state')).toHaveTextContent('ocupado');
    });

    it('does not start a second pull while one is running', () => {
        const { sheet, onRefresh } = setup();

        pull(sheet, 400);
        pull(sheet, 400);

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    const touchOn = (sheet: HTMLElement) => (type: string, y: number) => {
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperty(event, 'touches', { value: [{ clientX: 100, clientY: y }] });
        sheet.dispatchEvent(event);

        return event;
    };

    it('lets a touch pull stop the page from scrolling and then refreshes', () => {
        const { sheet, onRefresh } = setup();
        const touch = touchOn(sheet);

        touch('touchstart', 100);
        const pulling = touch('touchmove', 200);
        sheet.dispatchEvent(new Event('touchend', { bubbles: true }));

        expect(pulling.defaultPrevented).toBe(true);
        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('keeps a plain upward swipe as a normal page scroll', () => {
        const { sheet, onRefresh } = setup();
        const touch = touchOn(sheet);

        touch('touchstart', 300);
        const scrolling = touch('touchmove', 200);
        sheet.dispatchEvent(new Event('touchend', { bubbles: true }));

        expect(scrolling.defaultPrevented).toBe(false);
        expect(onRefresh).not.toHaveBeenCalled();
    });
});
