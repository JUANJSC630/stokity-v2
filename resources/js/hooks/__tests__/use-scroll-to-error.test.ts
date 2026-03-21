import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollToError } from '../use-scroll-to-error';

describe('useScrollToError', () => {
    let scrollIntoViewMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.useFakeTimers();
        scrollIntoViewMock = vi.fn();
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
    });

    it('does nothing when errors is empty', () => {
        const spy = vi.spyOn(document, 'querySelector');
        renderHook(() => useScrollToError({}));
        vi.advanceTimersByTime(100);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });

    it('scrolls to first error element when errors exist', () => {
        // Create an error element in the DOM
        const el = document.createElement('span');
        el.className = 'text-destructive';
        el.scrollIntoView = scrollIntoViewMock;
        document.body.appendChild(el);

        renderHook(() => useScrollToError({ name: 'El nombre es requerido' }));

        vi.advanceTimersByTime(100);

        expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    });

    it('also finds elements with text-red-500 class', () => {
        const el = document.createElement('span');
        el.className = 'text-red-500';
        el.scrollIntoView = scrollIntoViewMock;
        document.body.appendChild(el);

        renderHook(() => useScrollToError({ email: 'Email inválido' }));

        vi.advanceTimersByTime(100);

        expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    it('does not scroll when errors are all undefined', () => {
        const spy = vi.spyOn(document, 'querySelector');
        renderHook(() => useScrollToError({ name: undefined, email: undefined }));
        vi.advanceTimersByTime(100);
        expect(spy).not.toHaveBeenCalled();
        spy.mockRestore();
    });
});
