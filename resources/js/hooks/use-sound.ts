import { useCallback, useRef } from 'react';

type SoundType = 'success' | 'error' | 'warning';

const SOUNDS: Record<SoundType, { freq: number; duration: number; type: OscillatorType; volume: number }> = {
    success: { freq: 1200, duration: 0.1, type: 'sine', volume: 0.15 },
    error: { freq: 300, duration: 0.25, type: 'square', volume: 0.12 },
    warning: { freq: 600, duration: 0.15, type: 'triangle', volume: 0.12 },
};

export function useSound() {
    const ctxRef = useRef<AudioContext | null>(null);

    const play = useCallback((sound: SoundType) => {
        try {
            if (!ctxRef.current) {
                ctxRef.current = new AudioContext();
            }
            const ctx = ctxRef.current;
            const { freq, duration, type, volume } = SOUNDS[sound];

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.value = volume;
            // Quick fade-out to avoid click
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch {
            // Audio not available — silently ignore
        }
    }, []);

    return { play };
}
