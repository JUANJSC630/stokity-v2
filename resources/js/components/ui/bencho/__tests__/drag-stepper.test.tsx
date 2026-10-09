import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { DragStepper } from '../drag-stepper';

beforeAll(() => {
    // jsdom has no PointerEvent: a MouseEvent carrying the pointer id is enough for React's pointer handlers.
    class TestPointerEvent extends MouseEvent {
        pointerId: number;
        constructor(type: string, init: PointerEventInit = {}) {
            super(type, init);
            this.pointerId = init.pointerId ?? 1;
        }
    }
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    Element.prototype.setPointerCapture = vi.fn();
});

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

function Harness({ start = 5, min = 1, max = 20, sweepRange = 100 }: { start?: number; min?: number; max?: number; sweepRange?: number }) {
    const [value, setValue] = useState(start);
    return <DragStepper value={value} onChange={setValue} min={min} max={max} sweepRange={sweepRange} label="de Manillas" placeholder="1" />;
}

const less = () => screen.getByRole('button', { name: 'Menos de Manillas' });
const more = () => screen.getByRole('button', { name: 'Más de Manillas' });
const box = () => screen.getByRole('spinbutton', { name: 'de Manillas' }) as HTMLInputElement;

function tap(button: HTMLElement) {
    fireEvent.pointerDown(button, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(button, { clientX: 100, pointerId: 1 });
}

describe('DragStepper', () => {
    it('adds or removes one with a tap', () => {
        render(<Harness />);

        tap(more());
        expect(box().value).toBe('6');
        tap(less());
        tap(less());
        expect(box().value).toBe('4');
    });

    it('does not step twice when the click that follows a pointer tap arrives', () => {
        render(<Harness />);

        tap(more());
        fireEvent.click(more());

        expect(box().value).toBe('6');
    });

    it('steps by one for a plain click, which is how keyboards and screen readers activate a button', () => {
        render(<Harness />);

        fireEvent.click(more());
        fireEvent.click(less());
        fireEvent.click(less());

        expect(box().value).toBe('4');
    });

    it('turns a long press into a sweep that follows the drag', () => {
        render(<Harness start={10} max={100} />);
        const pill = more().parentElement as HTMLElement;

        fireEvent.pointerDown(more(), { clientX: 100, pointerId: 1 });
        act(() => {
            vi.advanceTimersByTime(300);
        });
        expect(pill).toHaveAttribute('data-sweep', 'true');

        fireEvent.pointerMove(more(), { clientX: 140, pointerId: 1 });
        const swept = Number(box().value);
        expect(swept).toBeGreaterThan(10);

        fireEvent.pointerUp(more(), { clientX: 140, pointerId: 1 });
        expect(pill).toHaveAttribute('data-sweep', 'false');
        expect(Number(box().value)).toBe(swept);
    });

    it('does not sweep before the press has lasted long enough', () => {
        render(<Harness start={10} max={100} />);

        fireEvent.pointerDown(more(), { clientX: 100, pointerId: 1 });
        fireEvent.pointerMove(more(), { clientX: 180, pointerId: 1 });

        expect(box().value).toBe('10');
    });

    it('never goes below the minimum or above the maximum, and disables the button at each end', () => {
        const { unmount } = render(<Harness start={1} />);
        expect(less()).toBeDisabled();
        unmount();

        render(<Harness start={20} />);
        expect(more()).toBeDisabled();
    });

    it('clamps a sweep to the range', () => {
        render(<Harness start={18} max={20} />);

        fireEvent.pointerDown(more(), { clientX: 0, pointerId: 1 });
        act(() => {
            vi.advanceTimersByTime(300);
        });
        fireEvent.pointerMove(more(), { clientX: 5000, pointerId: 1 });

        expect(box().value).toBe('20');
    });

    it('lets the number be cleared and retyped, and normalizes to the minimum on blur', () => {
        render(<Harness start={5} />);

        fireEvent.change(box(), { target: { value: '' } });
        expect(box().value).toBe('');

        fireEvent.change(box(), { target: { value: '12' } });
        expect(box().value).toBe('12');

        fireEvent.change(box(), { target: { value: '' } });
        fireEvent.blur(box());
        expect(box().value).toBe('1');
    });

    it('caps a typed number at the maximum', () => {
        render(<Harness start={5} max={20} />);

        fireEvent.change(box(), { target: { value: '99' } });

        expect(box().value).toBe('20');
    });

    it('moves with the arrow keys on the number', () => {
        render(<Harness start={5} />);

        fireEvent.keyDown(box(), { key: 'ArrowUp' });
        fireEvent.keyDown(box(), { key: 'ArrowUp' });
        fireEvent.keyDown(box(), { key: 'ArrowDown' });

        expect(box().value).toBe('6');
    });

    it('follows a value changed from outside', () => {
        const { rerender } = render(<DragStepper value={3} onChange={vi.fn()} label="de Manillas" />);

        rerender(<DragStepper value={9} onChange={vi.fn()} label="de Manillas" />);

        expect(box().value).toBe('9');
    });
});
