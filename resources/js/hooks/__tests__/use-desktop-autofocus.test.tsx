import { render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDesktopAutofocus } from '../use-desktop-autofocus';

function Probe() {
    const ref = useRef<HTMLInputElement>(null);
    useDesktopAutofocus(ref);

    return <input ref={ref} aria-label="campo" />;
}

const setWidth = (width: number) => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });

afterEach(() => setWidth(1024));

describe('useDesktopAutofocus', () => {
    it('focuses the field on large screens', () => {
        setWidth(1280);
        const { getByLabelText } = render(<Probe />);

        expect(getByLabelText('campo')).toHaveFocus();
    });

    it('leaves the keyboard closed on phones', () => {
        setWidth(390);
        const { getByLabelText } = render(<Probe />);

        expect(getByLabelText('campo')).not.toHaveFocus();
    });
});
