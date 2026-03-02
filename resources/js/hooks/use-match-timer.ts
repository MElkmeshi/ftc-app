import { type SoundName } from '@/hooks/use-audio-engine';
import { MatchPhase } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface MatchTimingConfig {
    pre_match_countdown: number;
    autonomous: number;
    transition: number;
    teleop: number;
    endgame_warning: number;
    controllers_warning_offset: number;
    total_match: number;
    total_with_countdown: number;
}

interface MatchTimerConfig {
    timing?: MatchTimingConfig;
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

// Default values matching FTC standards (fallback if config not loaded)
const DEFAULT_TIMING: MatchTimingConfig = {
    pre_match_countdown: 3,
    autonomous: 30,
    transition: 8,
    teleop: 120,
    endgame_warning: 20,
    controllers_warning_offset: 2,
    total_match: 158,
    total_with_countdown: 161,
};

export function useMatchTimer(config: MatchTimerConfig = {}): MatchTimerState & MatchTimerActions {
    const { timing = DEFAULT_TIMING, onMatchEnd, playSound } = config;

    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [phase, setPhase] = useState<MatchPhase>('pre-match');

    const startTimeRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const soundsPlayedRef = useRef<Set<string>>(new Set());
    const onMatchEndRef = useRef(onMatchEnd);
    const playSoundRef = useRef(playSound);
    const timingRef = useRef(timing);

    onMatchEndRef.current = onMatchEnd;
    playSoundRef.current = playSound;
    timingRef.current = timing;

    /**
     * Calculate the current phase based on REMAINING time (countdown timer)
     * Following FTC Live's approach
     */
    const getPhase = useCallback(
        (remaining: number): MatchPhase => {
            const totalWithCountdown = timing.total_with_countdown;
            const totalMatch = timing.total_match;
            const teleopStart = timing.teleop;
            const endgameWarning = timing.endgame_warning;

            // Pre-match countdown (3 seconds before match)
            if (remaining > totalMatch) return 'pre-match';

            // Match ended
            if (remaining <= 0) return 'post-match';

            // Autonomous phase
            if (remaining > totalMatch - timing.autonomous) return 'autonomous';

            // Transition phase
            if (remaining > teleopStart) return 'transition';

            // Endgame phase
            if (remaining <= endgameWarning) return 'endgame';

            // Teleop phase
            return 'teleop';
        },
        [timing],
    );

    /**
     * Calculate remaining time in current phase
     */
    const getPhaseRemaining = useCallback(
        (remaining: number, currentPhase: MatchPhase): number => {
            const totalMatch = timing.total_match;
            const teleopStart = timing.teleop;
            const endgameWarning = timing.endgame_warning;

            switch (currentPhase) {
                case 'pre-match':
                    return remaining - totalMatch;
                case 'autonomous':
                    return remaining - (totalMatch - timing.autonomous);
                case 'transition':
                    return remaining - teleopStart;
                case 'teleop':
                    return remaining; // Show full teleop time (includes endgame)
                case 'endgame':
                    return remaining;
                default:
                    return 0;
            }
        },
        [timing],
    );

    /**
     * Sound cues based on REMAINING time (like FTC Live)
     * All timing is dynamic from settings - NO hardcoded values
     */
    const checkSoundCues = useCallback(
        (remaining: number) => {
            const totalMatch = timing.total_match;
            const countdownTime = timing.total_with_countdown;
            const teleopRemaining = timing.teleop; // When teleop starts
            const transitionRemaining = timing.teleop + timing.transition; // When transition starts
            const transitionCountdownStart = timing.teleop + 3; // Last 3s of transition
            const endgameWarning = timing.endgame_warning;

            // Pre-match countdown (3s before match, e.g., 2:53 for your setup)
            if (remaining <= countdownTime && remaining > totalMatch && !soundsPlayedRef.current.has('pre_countdown')) {
                soundsPlayedRef.current.add('pre_countdown');
                playSoundRef.current?.('countdown.wav');
            }

            // Match start (e.g., at 2:50)
            if (remaining <= totalMatch && remaining > totalMatch - 1 && !soundsPlayedRef.current.has('start')) {
                soundsPlayedRef.current.add('start');
                playSoundRef.current?.('match_start_whistle.wav');
            }

            // Transition starts / Auto ends (e.g., at 2:20)
            // Play "pick up controllers" sound
            if (
                remaining <= transitionRemaining &&
                remaining > transitionRemaining - 1 &&
                !soundsPlayedRef.current.has('transition_start')
            ) {
                soundsPlayedRef.current.add('transition_start');
                playSoundRef.current?.('controllers_pickup.wav');
            }

            // Last 3 seconds of transition (e.g., at 2:03)
            // Play countdown sound
            if (
                remaining <= transitionCountdownStart &&
                remaining > transitionCountdownStart - 1 &&
                !soundsPlayedRef.current.has('transition_countdown')
            ) {
                soundsPlayedRef.current.add('transition_countdown');
                playSoundRef.current?.('countdown.wav');
            }

            // Teleop starts / Transition ends (e.g., at 2:00)
            // Play end of auto sound
            if (
                remaining <= teleopRemaining &&
                remaining > teleopRemaining - 1 &&
                !soundsPlayedRef.current.has('teleop_start')
            ) {
                soundsPlayedRef.current.add('teleop_start');
                playSoundRef.current?.('auto_end_ftc.wav');
            }

            // Endgame warning (last 30s of teleop, e.g., at 0:30)
            if (
                remaining <= endgameWarning &&
                remaining > endgameWarning - 1 &&
                !soundsPlayedRef.current.has('endgame')
            ) {
                soundsPlayedRef.current.add('endgame');
                playSoundRef.current?.('endgame_whistle.wav');
            }

            // Match end (at 0:00)
            if (remaining <= 0 && !soundsPlayedRef.current.has('end')) {
                soundsPlayedRef.current.add('end');
                playSoundRef.current?.('end_match.wav');
            }
        },
        [timing],
    );

    const tick = useCallback(() => {
        if (!startTimeRef.current) return;

        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current) / 1000);
        const totalDuration = timing.total_with_countdown;
        const clamped = Math.min(elapsed, totalDuration);

        // Calculate REMAINING time (countdown approach like FTC Live)
        const remaining = Math.max(0, totalDuration - clamped);

        setElapsedSeconds(clamped);
        setPhase(getPhase(remaining));
        checkSoundCues(remaining);

        if (clamped >= totalDuration) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            setIsRunning(false);
            setPhase('post-match');
            onMatchEndRef.current?.();
        }
    }, [timing, getPhase, checkSoundCues]);

    // Keep tick in a ref so setInterval always calls the latest version
    const tickRef = useRef(tick);
    tickRef.current = tick;

    const start = useCallback(() => {
        soundsPlayedRef.current.clear();
        startTimeRef.current = Date.now();
        setElapsedSeconds(0);
        setPhase('pre-match');
        setIsRunning(true);

        // Clear any existing interval
        if (intervalRef.current) clearInterval(intervalRef.current);

        // CRITICAL: Call tick() immediately for instant start (no delay)
        // This ensures the timer shows 2:41 immediately, not after 100ms
        tickRef.current();

        // Then start the interval for subsequent updates (50ms for smoother animation)
        intervalRef.current = setInterval(() => tickRef.current(), 50);
    }, []);

    const stop = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsRunning(false);
        setElapsedSeconds(timingRef.current.total_with_countdown);
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
            const totalDuration = timing.total_with_countdown;

            if (elapsed >= totalDuration) {
                setElapsedSeconds(totalDuration);
                setPhase('post-match');
                setIsRunning(false);
                return;
            }

            const remaining = totalDuration - elapsed;

            // Mark sounds that should have already played (so we don't replay them on resume)
            const totalMatch = timing.total_match;
            const teleopRemaining = timing.teleop;
            const transitionRemaining = timing.teleop + timing.transition;
            const transitionCountdownStart = timing.teleop + 3;

            if (remaining <= timing.total_with_countdown && remaining > totalMatch) {
                soundsPlayedRef.current.add('pre_countdown');
            }
            if (remaining <= totalMatch) soundsPlayedRef.current.add('start');
            if (remaining <= transitionRemaining) soundsPlayedRef.current.add('transition_start');
            if (remaining <= transitionCountdownStart) soundsPlayedRef.current.add('transition_countdown');
            if (remaining <= teleopRemaining) soundsPlayedRef.current.add('teleop_start');
            if (remaining <= timing.endgame_warning) soundsPlayedRef.current.add('endgame');

            startTimeRef.current = startedAt;
            setElapsedSeconds(elapsed);
            setPhase(getPhase(remaining));
            setIsRunning(true);

            if (intervalRef.current) clearInterval(intervalRef.current);

            // Call tick() immediately for instant resume (no delay)
            tickRef.current();

            // Then start interval for subsequent updates
            intervalRef.current = setInterval(() => tickRef.current(), 50);
        },
        [timing, getPhase],
    );

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    const totalDuration = timing.total_with_countdown;
    const remaining = Math.max(0, totalDuration - elapsedSeconds);
    const phaseRemaining = getPhaseRemaining(remaining, phase);
    const progressPercent = phase === 'post-match' ? 100 : totalDuration > 0 ? (elapsedSeconds / totalDuration) * 100 : 0;

    return {
        elapsedSeconds,
        phase,
        isRunning,
        remainingSeconds: remaining,
        phaseRemainingSeconds: phaseRemaining,
        progressPercent,
        start,
        stop,
        cancel,
        resumeFrom,
    };
}
