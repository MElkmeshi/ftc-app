import { Howl, Howler } from 'howler';
import { useCallback, useEffect, useRef, useState } from 'react';

// FTC Live official sound files
const SOUND_FILES = [
    'countdown.wav', // 3-2-1 countdown (pre-match and transition)
    'match_start_whistle.wav', // Match start whistle
    'auto_end_ftc.wav', // End of transition (start of teleop)
    'controllers_pickup.wav', // Pick up controllers (start of transition)
    'endgame_whistle.wav', // Endgame warning
    'end_match.wav', // Match end
    'canel_match.wav', // Match cancelled/aborted
    'unmute.wav', // Confirms a display's sound was just unlocked
] as const;

export type SoundName = (typeof SOUND_FILES)[number];

interface AudioEngine {
    playSound: (name: SoundName) => void;
    /**
     * Whether the browser's audio autoplay gate is open. Chrome/Safari block
     * audio until the page has received a real user gesture (click, tap, key
     * press) -- this never happens on an unattended display page (nothing to
     * click), which is why sound "only works" on pages the operator actually
     * interacts with. Callers should show an unlock prompt while this is false.
     */
    unlocked: boolean;
}

function isAudioContextRunning(): boolean {
    return Howler.ctx?.state === 'running';
}

export function useAudioEngine(): AudioEngine {
    const soundsRef = useRef<Map<SoundName, Howl>>(new Map());
    const [unlocked, setUnlocked] = useState(isAudioContextRunning);

    // Pre-load all sounds using Howler.js (same as FTC Live)
    useEffect(() => {
        SOUND_FILES.forEach((file) => {
            const howl = new Howl({
                src: [`/sounds/${file}`],
                preload: true,
                html5: false, // Use Web Audio API for better background support
                volume: 1.0,
                onplayerror: () => {
                    // Try to unlock and play again
                    howl.once('unlock', () => {
                        howl.play();
                    });
                },
            });

            soundsRef.current.set(file, howl);
        });

        return () => {
            soundsRef.current.forEach((howl) => {
                howl.unload();
            });
            soundsRef.current.clear();
        };
    }, []);

    // Explicitly resume the shared audio context on the first user gesture
    // anywhere on the page, instead of relying on a click landing on some
    // specific interactive element (a display page has none).
    useEffect(() => {
        if (unlocked) {
            return;
        }

        const tryUnlock = () => {
            Howler.ctx?.resume().then(() => setUnlocked(isAudioContextRunning()));
            setUnlocked(isAudioContextRunning());
        };

        const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'touchstart'];
        events.forEach((event) => window.addEventListener(event, tryUnlock));

        return () => {
            events.forEach((event) => window.removeEventListener(event, tryUnlock));
        };
    }, [unlocked]);

    const playSound = useCallback((name: SoundName) => {
        const howl = soundsRef.current.get(name);
        if (!howl) return;

        howl.play();
    }, []);

    return { playSound, unlocked };
}
