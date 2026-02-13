import { type SoundName } from '@/hooks/use-audio-engine';
import { MatchPhase } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

const AUTONOMOUS_DURATION = 30;
const TRANSITION_DURATION = 10;
const TELEOP_START = AUTONOMOUS_DURATION + TRANSITION_DURATION;
const ENDGAME_START = 130;
const MATCH_DURATION = 160;
const RESUME_START_SOUND_THRESHOLD = 5;

interface MatchTimerConfig {
    matchDurationSeconds?: number;
    onMatchEnd?: () => void;
    playSound?: (name: SoundName) => void;
}

interface MatchTimerState {
    elapsedSeconds: number;
    phase: MatchPhase;
    isRunning: boolean;
    remainingSeconds: number;
    phaseRemainingSeconds: number;
    progressPercent: number;
}

interface MatchTimerActions {
    start: () => void;
    stop: () => void;
    cancel: () => void;
    resumeFrom: (startedAtIso: string) => void;
}

export function useMatchTimer(config: MatchTimerConfig = {}): MatchTimerState & MatchTimerActions {
    const { matchDurationSeconds = MATCH_DURATION, onMatchEnd, playSound } = config;

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState<MatchPhase>('pre-match');

    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const soundsPlayedRef = useRef<Set<string>>(new Set());
    const onMatchEndRef = useRef(onMatchEnd);
    const playSoundRef = useRef(playSound);

    onMatchEndRef.current = onMatchEnd;
    playSoundRef.current = playSound;

    const getPhase = useCallback(
        (elapsed: number): MatchPhase => {
            if (elapsed <= 0) return 'pre-match';
            if (elapsed >= matchDurationSeconds) return 'post-match';
            if (elapsed <= AUTONOMOUS_DURATION) return 'autonomous';
            if (elapsed <= TELEOP_START) return 'transition';
            if (elapsed < ENDGAME_START) return 'teleop';
            return 'endgame';
        },
        [matchDurationSeconds],
    );

    const getPhaseRemaining = useCallback(
        (elapsed: number, currentPhase: MatchPhase): number => {
            switch (currentPhase) {
                case 'autonomous':
                    return AUTONOMOUS_DURATION - elapsed;
                case 'transition':
                    return TELEOP_START - elapsed;
                case 'teleop':
                    return ENDGAME_START - elapsed;
                case 'endgame':
                    return matchDurationSeconds - elapsed;
                default:
                    return 0;
            }
        },
        [matchDurationSeconds],
    );

    const checkSoundCues = useCallback(
        (elapsed: number) => {
            if (elapsed >= 1 && !soundsPlayedRef.current.has('start')) {
                soundsPlayedRef.current.add('start');
                playSoundRef.current?.('start_match.wav');
            }

            if (elapsed >= AUTONOMOUS_DURATION && !soundsPlayedRef.current.has('end_auto_1')) {
                soundsPlayedRef.current.add('end_auto_1');
                playSoundRef.current?.('end_autonomous_1.wav');
            }

            // Play end_autonomous_23 when transition countdown reaches 3 (elapsed = 37s)
            if (elapsed >= 37 && !soundsPlayedRef.current.has('end_auto_2')) {
                soundsPlayedRef.current.add('end_auto_2');
                playSoundRef.current?.('end_autonomous_23.wav');
            }

            if (elapsed >= ENDGAME_START && !soundsPlayedRef.current.has('endgame')) {
                soundsPlayedRef.current.add('endgame');
                playSoundRef.current?.('start_endgame.wav');
            }

            if (elapsed >= matchDurationSeconds && !soundsPlayedRef.current.has('end')) {
                soundsPlayedRef.current.add('end');
                playSoundRef.current?.('end_match.wav');
            }
        },
        [matchDurationSeconds],
    );

    const tick = useCallback(() => {
        if (!startTimeRef.current) return;

        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const clamped = Math.min(elapsed, matchDurationSeconds);

        setElapsedSeconds(clamped);
        setPhase(getPhase(clamped));
        checkSoundCues(clamped);

        if (clamped >= matchDurationSeconds) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsRunning(false);
            setPhase('post-match');
            onMatchEndRef.current?.();
        }
    }, [matchDurationSeconds, getPhase, checkSoundCues]);

    // Keep tick in a ref so setInterval always calls the latest version
    const tickRef = useRef(tick);
    tickRef.current = tick;

    const start = useCallback(() => {
        soundsPlayedRef.current.clear();
        soundsPlayedRef.current.add('start');
        startTimeRef.current = Date.now();
        setElapsedSeconds(0);
        setPhase('autonomous');
        setIsRunning(true);

        playSoundRef.current?.('start_match.wav');

        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => tickRef.current(), 100);
    }, []);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsRunning(false);
        setPhase('post-match');
    }, []);

    const cancel = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        playSoundRef.current?.('canel_match.wav');
        setIsRunning(false);
        setElapsedSeconds(0);
        setPhase('pre-match');
        soundsPlayedRef.current.clear();
        startTimeRef.current = null;
    }, []);

    const resumeFrom = useCallback(
        (startedAtIso: string) => {
            const startedAt = new Date(startedAtIso).getTime();
            const now = Date.now();
            const elapsed = Math.floor((now - startedAt) / 1000);

            if (elapsed >= matchDurationSeconds) {
                setElapsedSeconds(matchDurationSeconds);
                setPhase('post-match');
                setIsRunning(false);
                return;
            }

            // Play start sound if match just started (within threshold)
            if (elapsed < RESUME_START_SOUND_THRESHOLD) {
                playSoundRef.current?.('start_match.wav');
            }

            // Mark sounds that should have already played as played (don't replay on resume)
            if (elapsed >= 1) soundsPlayedRef.current.add('start');
            if (elapsed >= AUTONOMOUS_DURATION) soundsPlayedRef.current.add('end_auto_1');
            if (elapsed >= 37) soundsPlayedRef.current.add('end_auto_2');
            if (elapsed >= ENDGAME_START) soundsPlayedRef.current.add('endgame');

            startTimeRef.current = startedAt;
            setElapsedSeconds(elapsed);
            setPhase(getPhase(elapsed));
            setIsRunning(true);

            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => tickRef.current(), 100);
        },
        [matchDurationSeconds, getPhase],
    );

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const remainingSeconds = Math.max(0, matchDurationSeconds - elapsedSeconds);
    const phaseRemainingSeconds = getPhaseRemaining(elapsedSeconds, phase);
    const progressPercent = matchDurationSeconds > 0 ? (elapsedSeconds / matchDurationSeconds) * 100 : 0;

    return {
        elapsedSeconds,
        phase,
        isRunning,
        remainingSeconds,
        phaseRemainingSeconds,
        progressPercent,
        start,
        stop,
        cancel,
        resumeFrom,
    };
}
