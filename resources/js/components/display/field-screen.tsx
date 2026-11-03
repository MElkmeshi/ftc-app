import { MatchScreen } from '@/components/display/audience-screen';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { type SoundName } from '@/hooks/use-audio-engine';
import { useLoadedMatch, useMatch } from '@/hooks/use-match';
import { useEffect, useState } from 'react';

/**
 * The drive teams' screen. It ignores what the audience is being shown and
 * always follows the field: the loaded match before it starts, the running
 * match with its timer, then the final score until the next match is loaded.
 */
export function FieldScreen({ playSound, flipped }: { playSound?: (name: SoundName) => void; flipped: boolean }) {
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound });
    const { data: loadedMatch } = useLoadedMatch(5000);
    const [lastPlayedMatchId, setLastPlayedMatchId] = useState<number | null>(null);

    useEffect(() => {
        if (activeMatch) {
            setLastPlayedMatchId(activeMatch.id);
        }
    }, [activeMatch]);

    // A newly loaded match replaces the previous final score.
    useEffect(() => {
        if (loadedMatch && loadedMatch.id !== lastPlayedMatchId && !activeMatch && timer.phase === 'post-match') {
            timer.reset();
        }
    }, [loadedMatch, lastPlayedMatchId, activeMatch, timer]);

    const showingFinal = !activeMatch && timer.phase === 'post-match';
    const matchId = activeMatch?.id ?? (showingFinal ? lastPlayedMatchId : null) ?? loadedMatch?.id ?? null;
    const { data: match } = useMatch(matchId, 5000);

    return (
        <MatchScreen
            match={matchId ? match : null}
            timer={timer}
            teleopSeconds={matchConfig?.timing.teleop ?? 120}
            flipped={flipped}
            waitingLabel="No match loaded"
        />
    );
}
