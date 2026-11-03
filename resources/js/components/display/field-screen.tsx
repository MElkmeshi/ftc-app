import { MatchScreen } from '@/components/display/audience-screen';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { type SoundName } from '@/hooks/use-audio-engine';
import { useFieldCount } from '@/hooks/use-field-count';
import { useLoadedMatch, useMatch, useMatches } from '@/hooks/use-match';
import { getFieldLabel } from '@/lib/match-utils';
import { type CompetitionMatch } from '@/types';
import { useEffect, useState } from 'react';

/**
 * The drive teams' screen. It ignores what the audience is being shown and
 * always follows the field: the loaded match before it starts, the running
 * match with its timer, then the final score until the next match is loaded.
 *
 * At a multi-field event a screen can follow one field (like FTC Live's
 * "bind to field"); it then ignores the other field's matches and, while
 * nothing is happening on its own field, shows the next match coming to it.
 */
export function FieldScreen({ playSound, flipped, field }: { playSound?: (name: SoundName) => void; flipped: boolean; field: number | null }) {
    const fieldCount = useFieldCount();
    const boundField = field && field <= fieldCount && fieldCount > 1 ? field : null;
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound, field: boundField });
    const { data: anyLoadedMatch } = useLoadedMatch(5000);
    const { data: matches = [] } = useMatches(15000);
    const [lastPlayedMatchId, setLastPlayedMatchId] = useState<number | null>(null);

    const isOnThisField = (match: CompetitionMatch | null | undefined): match is CompetitionMatch =>
        !!match && (!boundField || match.field === boundField);
    const loadedMatch = isOnThisField(anyLoadedMatch) ? anyLoadedMatch : null;
    const nextOnField = boundField
        ? matches.filter((match) => match.status === 'upcoming' && match.field === boundField).sort((a, b) => a.number - b.number)[0]
        : undefined;

    useEffect(() => {
        if (activeMatch) {
            setLastPlayedMatchId(activeMatch.id);
        }
    }, [activeMatch]);

    // A newly loaded match on this field replaces the previous final score.
    useEffect(() => {
        if (loadedMatch && loadedMatch.id !== lastPlayedMatchId && !activeMatch && timer.phase === 'post-match') {
            timer.reset();
        }
    }, [loadedMatch, lastPlayedMatchId, activeMatch, timer]);

    const showingFinal = !activeMatch && timer.phase === 'post-match';
    const matchId = activeMatch?.id ?? (showingFinal ? lastPlayedMatchId : null) ?? loadedMatch?.id ?? nextOnField?.id ?? null;
    const { data: match } = useMatch(matchId, 5000);
    const shown = matchId ? match : null;

    return (
        <MatchScreen
            match={shown}
            timer={timer}
            teleopSeconds={matchConfig?.timing.teleop ?? 120}
            flipped={flipped}
            waitingLabel={boundField ? 'No more matches on this field' : 'No match loaded'}
            fieldLabel={boundField ? `Field ${boundField}` : shown ? getFieldLabel(shown, fieldCount) : null}
        />
    );
}
