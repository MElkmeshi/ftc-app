import { useCallback, useEffect, useRef } from 'react';

// FTC Live official sound files
const SOUND_FILES = [
    'countdown.wav', // 3-2-1 countdown (plays at 2:41)
    'match_start_whistle.wav', // Match start whistle (plays at 2:38)
    'auto_end_ftc.wav', // End of autonomous (plays at 2:08)
    'controllers_pickup.wav', // Pick up controllers (plays at 2:06)
    'endgame_whistle.wav', // Endgame warning (plays at 0:20)
    'end_match.wav', // Match end (plays at 0:00)
    'canel_match.wav', // Match cancelled/aborted
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
            console.log('[Audio] AudioContext created, initial state:', ctx.state);

            // Create a silent audio loop to keep AudioContext active (FTC Live technique)
            // This prevents the context from suspending and ensures sounds play immediately
            const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
            const channelData = buffer.getChannelData(0);
            channelData[0] = 0.01; // Very quiet sample

            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.start(0);
            source.connect(ctx.destination);

            console.log('[Audio] ✓ Silent audio loop started to keep context alive');

            if (ctx.state === 'suspended') {
                ctx.resume()
                    .then(() => console.log('[Audio] ✓ AudioContext resumed on mount, state:', ctx.state))
                    .catch((err) => console.error('[Audio] ✗ Failed to resume AudioContext on mount:', err));
            }
        } catch (err) {
            console.error('[Audio] AudioContext not supported:', err);
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
                console.log('[Audio] User interaction detected, unlocking AudioContext...');
                ctx.resume()
                    .then(() => console.log('[Audio] ✓ AudioContext unlocked, state:', ctx.state))
                    .catch((err) => console.error('[Audio] ✗ Failed to unlock AudioContext:', err));
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
        if (!audio) {
            console.error('[Audio] Sound file not loaded:', name);
            return;
        }

        const ctx = ctxRef.current;
        console.log('[Audio] Attempting to play:', name, '| AudioContext state:', ctx?.state ?? 'no context');

        // Clone the element so overlapping plays work (e.g. end_autonomous_1 + 2)
        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.currentTime = 0;
        clone
            .play()
            .then(() => console.log('[Audio] ✓ Successfully played:', name))
            .catch((err) => console.error('[Audio] ✗ Failed to play:', name, '| Error:', err.message || err));
    }, []);

    return { playSound };
}
