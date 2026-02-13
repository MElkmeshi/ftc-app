import { useCallback, useEffect, useRef } from 'react';

const SOUND_FILES = [
    'start_match.wav',
    'end_autonomous_1.wav',
    'end_autonomous_2.wav',
    'start_endgame.wav',
    'end_match.wav',
    'canel_match.wav',
] as const;

export type SoundName = (typeof SOUND_FILES)[number];

interface AudioEngine {
    playSound: (name: SoundName) => void;
}

export function useAudioEngine(): AudioEngine {
    const audioRef = useRef<Map<SoundName, HTMLAudioElement>>(new Map());
    const ctxRef = useRef<AudioContext | null>(null);

    // Pre-load all sounds as HTMLAudioElements
    useEffect(() => {
        SOUND_FILES.forEach((file) => {
            const audio = new Audio(`/sounds/${file}`);
            audio.preload = 'auto';
            audioRef.current.set(file, audio);
        });

        // Create AudioContext and try to resume it immediately.
        // This unlocks audio in permissive environments (e.g. OBS browser source).
        try {
            const ctx = new AudioContext();
            ctxRef.current = ctx;
            if (ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
        } catch {
            // AudioContext not supported — HTMLAudioElement fallback only
        }

        return () => {
            audioRef.current.forEach((audio) => {
                audio.pause();
                audio.src = '';
            });
            audioRef.current.clear();
            ctxRef.current?.close();
            ctxRef.current = null;
        };
    }, []);

    // Try to unlock AudioContext on user interaction (helps if someone does click the page)
    useEffect(() => {
        const unlock = () => {
            const ctx = ctxRef.current;
            if (ctx && ctx.state === 'suspended') {
                ctx.resume().catch(() => {});
            }
        };

        const events: Array<keyof DocumentEventMap> = ['click', 'touchstart', 'keydown'];
        events.forEach((e) => document.addEventListener(e, unlock, { capture: true }));

        return () => {
            events.forEach((e) => document.removeEventListener(e, unlock, { capture: true }));
        };
    }, []);

    const playSound = useCallback((name: SoundName) => {
        const audio = audioRef.current.get(name);
        if (!audio) return;

        // Clone the element so overlapping plays work (e.g. end_autonomous_1 + 2)
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.currentTime = 0;
        clone.play().catch(() => {});
    }, []);

    return { playSound };
}
