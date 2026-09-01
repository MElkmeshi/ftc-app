import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const howlerState = vi.hoisted(() => ({ ctxState: 'suspended' as 'suspended' | 'running' }));

vi.mock('howler', () => {
    class Howl {
        play = vi.fn();
        once = vi.fn();
        unload = vi.fn();
        constructor() {}
    }

    return {
        Howl,
        Howler: {
            get ctx() {
                return {
                    state: howlerState.ctxState,
                    resume: vi.fn(() => {
                        howlerState.ctxState = 'running';
                        return Promise.resolve();
                    }),
                };
            },
        },
    };
});

const { useAudioEngine } = await import('./use-audio-engine');

describe('useAudioEngine', () => {
    afterEach(() => {
        howlerState.ctxState = 'suspended';
    });

    it('starts locked when the audio context is suspended (the display-page case)', () => {
        const { result } = renderHook(() => useAudioEngine());
        expect(result.current.unlocked).toBe(false);
    });

    it('unlocks on the first user gesture anywhere on the page', () => {
        const { result } = renderHook(() => useAudioEngine());
        expect(result.current.unlocked).toBe(false);

        act(() => {
            window.dispatchEvent(new Event('pointerdown'));
        });

        expect(result.current.unlocked).toBe(true);
    });

    it('starts unlocked already if the context happens to already be running', () => {
        howlerState.ctxState = 'running';
        const { result } = renderHook(() => useAudioEngine());
        expect(result.current.unlocked).toBe(true);
    });
});
