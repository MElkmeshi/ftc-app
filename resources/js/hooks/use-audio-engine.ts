import { Howl } from 'howler';
import { useCallback, useEffect, useRef } from 'react';

// FTC Live official sound files
const SOUND_FILES = [
    'countdown.wav', // 3-2-1 countdown (pre-match and transition)
    'match_start_whistle.wav', // Match start whistle
    'auto_end_ftc.wav', // End of transition (start of teleop)
    'controllers_pickup.wav', // Pick up controllers (start of transition)
    'endgame_whistle.wav', // Endgame warning
    'end_match.wav', // Match end
    'canel_match.wav', // Match cancelled/aborted
] as const;

export type SoundName = (typeof SOUND_FILES)[number];

interface AudioEngine {
    playSound: (name: SoundName) => void;
}

export function useAudioEngine(): AudioEngine {
    const soundsRef = useRef<Map<SoundName, Howl>>(new Map());

    // Pre-load all sounds using Howler.js (same as FTC Live)
    useEffect(() => {
        SOUND_FILES.forEach((file) => {
            const howl = new Howl({
                src: [`/sounds/${file}`],
                preload: true,
                html5: false, // Use Web Audio API for better background support
                volume: 1.0,
                onplayerror: (_id, _err) => {
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

    const playSound = useCallback((name: SoundName) => {
        const howl = soundsRef.current.get(name);
        if (!howl) return;

        howl.play();
    }, []);

    return { playSound };
}
