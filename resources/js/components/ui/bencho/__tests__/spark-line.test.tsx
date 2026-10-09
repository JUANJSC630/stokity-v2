import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SparkLine, sparkCurve } from '../spark-line';

class TestPointerEvent extends MouseEvent {
    pointerId: number;

    constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 0;
    }
}

beforeEach(() => {
    vi.stubGlobal('PointerEvent', TestPointerEvent);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 0, right: 400, bottom: 80, width: 300, height: 80, x: 100, y: 0, toJSON: () => ({}) });
});

const setup = (values = [10, 40, 20, 60], scrub: number | null = null) => {
    const onScrub = vi.fn();
    render(<SparkLine values={values} scrub={scrub} onScrub={onScrub} label="Ingresos" describe={(i) => `punto ${i}`} />);

    return { onScrub, slider: screen.getByRole('slider', { name: 'Ingresos' }) };
};

describe('sparkCurve', () => {
    it('starts at the first value and ends at the last', () => {
        const curve = sparkCurve([10, 40, 20, 60]);

        expect(curve.d.startsWith('M0.00')).toBe(true);
        expect(curve.at(0).x).toBeCloseTo(0);
        expect(curve.at(3).x).toBeCloseTo(100);
    });

    it('draws higher values higher on the chart', () => {
        const curve = sparkCurve([10, 60]);

        expect(curve.at(1).y).toBeLessThan(curve.at(0).y);
    });

    it('passes through the middle of the box for a flat series', () => {
        const curve = sparkCurve([5, 5, 5]);

        expect(curve.at(0).y).toBe(20);
        expect(curve.at(2).y).toBe(20);
    });

    it('closes the area under the curve', () => {
        expect(sparkCurve([1, 2, 3]).area.endsWith('L100 40 L0 40 Z')).toBe(true);
    });
});

describe('SparkLine', () => {
    it('describes the position it rests on, the latest point by default', () => {
        const { slider } = setup();

        expect(slider).toHaveAttribute('aria-valuenow', '3');
        expect(slider).toHaveAttribute('aria-valuetext', 'punto 3');
    });

    it('reports the fractional position under the pointer', () => {
        const { onScrub, slider } = setup();

        fireEvent.pointerMove(slider, { clientX: 250 });

        expect(onScrub).toHaveBeenLastCalledWith(1.5);
    });

    it('clamps to the ends of the line', () => {
        const { onScrub, slider } = setup();

        fireEvent.pointerMove(slider, { clientX: 10 });
        expect(onScrub).toHaveBeenLastCalledWith(0);

        fireEvent.pointerMove(slider, { clientX: 999 });
        expect(onScrub).toHaveBeenLastCalledWith(3);
    });

    it('clears the scrub when the pointer leaves or is cancelled', () => {
        const { onScrub, slider } = setup();

        fireEvent.pointerLeave(slider);
        expect(onScrub).toHaveBeenLastCalledWith(null);

        fireEvent.pointerCancel(slider);
        expect(onScrub).toHaveBeenCalledTimes(2);
    });

    it('moves one point at a time with the arrow keys', () => {
        const { onScrub, slider } = setup([10, 40, 20, 60], 2);

        fireEvent.keyDown(slider, { key: 'ArrowLeft' });
        expect(onScrub).toHaveBeenLastCalledWith(1);

        fireEvent.keyDown(slider, { key: 'ArrowRight' });
        expect(onScrub).toHaveBeenLastCalledWith(3);
    });

    it('does not move past either end', () => {
        const first = setup([1, 2, 3], 0);
        fireEvent.keyDown(first.slider, { key: 'ArrowLeft' });
        expect(first.onScrub).toHaveBeenLastCalledWith(0);
    });

    it('jumps with Home and End and clears with Escape', () => {
        const { onScrub, slider } = setup([10, 40, 20, 60], 1);

        fireEvent.keyDown(slider, { key: 'Home' });
        expect(onScrub).toHaveBeenLastCalledWith(0);

        fireEvent.keyDown(slider, { key: 'End' });
        expect(onScrub).toHaveBeenLastCalledWith(3);

        fireEvent.keyDown(slider, { key: 'Escape' });
        expect(onScrub).toHaveBeenLastCalledWith(null);
    });

    it('clears the scrub when focus leaves', () => {
        const { onScrub, slider } = setup();

        fireEvent.blur(slider);

        expect(onScrub).toHaveBeenLastCalledWith(null);
    });

    it('marks the plot while scrubbing', () => {
        const { slider } = setup([10, 40, 20, 60], 1.5);

        expect(slider).toHaveAttribute('data-scrub');
        expect(slider).toHaveAttribute('aria-valuenow', '2');
    });

    it('draws nothing without values', () => {
        const { container } = render(<SparkLine values={[]} scrub={null} onScrub={vi.fn()} label="vacío" describe={() => ''} />);

        expect(container).toBeEmptyDOMElement();
    });
});
