import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SlideConfirm } from '../slide-confirm';

const WIDTH = 300;
const TRAVEL = WIDTH - 8 - 48;

class TestPointerEvent extends MouseEvent {
    pointerId: number;

    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
    }
}

beforeEach(() => {
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: WIDTH, bottom: 56, width: WIDTH, height: 56, x: 0, y: 0, toJSON: () => ({}) });
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});

afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const renderSlide = (props: Partial<React.ComponentProps<typeof SlideConfirm>> = {}) => {
    const onConfirm = vi.fn();
    const utils = render(<SlideConfirm label="Desliza para entrar" confirmedLabel="Entrando…" onConfirm={onConfirm} {...props} />);
    const track = utils.container.querySelector('[class*="track"]') as HTMLElement;

    return { ...utils, onConfirm, track };
};

function drag(track: HTMLElement, from: number, to: number) {
    fireEvent.pointerDown(track, { pointerId: 1, clientX: from, button: 0 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: from });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: (from + to) / 2 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: to });
    fireEvent.pointerUp(window, { pointerId: 1, clientX: to });
}

describe('SlideConfirm', () => {
    it('confirms once when the handle is dragged all the way across', () => {
        const { track, onConfirm } = renderSlide();

        drag(track, 30, 30 + TRAVEL);

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not confirm when released before the end', () => {
        const { track, onConfirm } = renderSlide();

        drag(track, 30, 30 + TRAVEL / 2);

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('can be confirmed from the keyboard, since a drag is not possible there', () => {
        const { onConfirm } = renderSlide();

        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not treat a pointer click on the handle as a confirmation', () => {
        const { onConfirm } = renderSlide();

        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }), { detail: 1 });

        expect(onConfirm).not.toHaveBeenCalled();
    });

    it('ignores both the drag and the keyboard when disabled', () => {
        const { track, onConfirm } = renderSlide({ disabled: true });

        drag(track, 30, 30 + TRAVEL);
        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Desliza para entrar' })).toBeDisabled();
    });

    it('announces the confirmed state and resets so the action can be retried', () => {
        const { onConfirm } = renderSlide();

        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }));
        expect(screen.getByRole('status')).toHaveTextContent('Entrando…');
        expect(screen.getByRole('button', { name: 'Entrando…' })).toBeInTheDocument();

        act(() => {
            vi.advanceTimersByTime(1600);
        });
        expect(screen.getByRole('status')).toBeEmptyDOMElement();

        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }));
        expect(onConfirm).toHaveBeenCalledTimes(2);
    });

    it('confirms only once while already confirmed', () => {
        const { onConfirm } = renderSlide();

        fireEvent.click(screen.getByRole('button', { name: 'Desliza para entrar' }));
        fireEvent.click(screen.getByRole('button', { name: 'Entrando…' }));

        expect(onConfirm).toHaveBeenCalledTimes(1);
    });
});
