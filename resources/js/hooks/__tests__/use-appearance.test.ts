import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initializeTheme, useAppearance } from '../use-appearance';

describe('system theme listener', () => {
    const listeners = new Set<() => void>();
    let prefersDark = false;

    beforeEach(() => {
        listeners.clear();
        prefersDark = false;
        localStorage.clear();
        document.documentElement.classList.remove('dark');
        vi.stubGlobal('matchMedia', () => ({
            get matches() {
                return prefersDark;
            },
            addEventListener: (_type: string, callback: () => void) => listeners.add(callback),
            removeEventListener: (_type: string, callback: () => void) => listeners.delete(callback),
        }));
    });

    afterEach(() => vi.unstubAllGlobals());

    it('is registered once by initializeTheme', () => {
        initializeTheme();

        expect(listeners.size).toBe(1);
    });

    it('survives mounting and unmounting the appearance hook', () => {
        initializeTheme();

        const { unmount } = renderHook(() => useAppearance());
        unmount();

        expect(listeners.size).toBe(1);
    });

    it('keeps following the operating system after the hook was unmounted', () => {
        initializeTheme();
        renderHook(() => useAppearance()).unmount();

        prefersDark = true;
        listeners.forEach((callback) => callback());

        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('does not follow the system when the user chose light', () => {
        localStorage.setItem('appearance', 'light');
        initializeTheme();

        prefersDark = true;
        listeners.forEach((callback) => callback());

        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
