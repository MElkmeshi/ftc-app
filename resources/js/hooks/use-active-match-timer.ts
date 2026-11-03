import { type SoundName } from '@/hooks/use-audio-engine';
import { useActiveMatch, useMatches } from '@/hooks/use-match';
import { useMatchConfig } from '@/hooks/use-match-config';
import { useMatchTimer } from '@/hooks/use-match-timer';
import { useEffect, useRef } from 'react';

interface UseActiveMatchTimerOptions {
    playSound?: (name: SoundName) => void;
    onMatchEnd?: () => void;
    /** Only follow matches on this field (a field display at a multi-field event). */
    field?: number | null;
}

/**
 * Combines useActiveMatch, useMatchConfig, and useMatchTimer into a single hook.
 * Automatically resumes the timer when an ongoing match is detected and stops it
 * when the match is no longer active. Handles the cancel-and-restart case by
 * tracking both match ID and started_at timestamp.
 */
export function useActiveMatchTimer(options: UseActiveMatchTimerOptions = {}) {
    const { playSound, onMatchEnd, field = null } = options;

    const { data: anyActiveMatch } = useActiveMatch(15000);
    const activeMatch = field && anyActiveMatch && anyActiveMatch.field !== field ? null : anyActiveMatch;
    const { data: matches = [] } = useMatches(15000);
    const { config: matchConfig } = useMatchConfig();

    const lastStartedMatchIdRef = useRef<number | null>(null);
    const lastStartedAtRef = useRef<string | null>(null);

    const timer = useMatchTimer({ timing: matchConfig?.timing, playSound, onMatchEnd });

    useEffect(() => {
        if (activeMatch && activeMatch.status === 'ongoing' && activeMatch.started_at) {
            const isNewStart = lastStartedMatchIdRef.current !== activeMatch.id || lastStartedAtRef.current !== activeMatch.started_at;

            if (!timer.isRunning && isNewStart) {
                timer.resumeFrom(activeMatch.started_at, activeMatch.duration_ms ?? undefined);
                lastStartedMatchIdRef.current = activeMatch.id;
                lastStartedAtRef.current = activeMatch.started_at;
            }
        } else if (timer.isRunning) {
            // Wait for the matches list to confirm the final status before stopping.
            // This avoids a race where activeMatch returns null before the matches cache updates.
            const lastMatch = lastStartedMatchIdRef.current ? matches.find((m) => m.id === lastStartedMatchIdRef.current) : null;

            if (lastMatch?.status === 'ongoing') {
                // Cache not updated yet — wait for the next poll
                return;
            }

            // Cancel reverts the match to 'upcoming' (started_at cleared).
            // Completed matches keep their status as 'completed'.
            if (lastMatch?.status === 'upcoming') {
                timer.cancel();
            } else {
                timer.stop();
            }
        }
    }, [activeMatch, timer, matches]);

    return { timer, activeMatch, matchConfig };
}
