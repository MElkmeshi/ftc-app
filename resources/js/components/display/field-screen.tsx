import { AllianceSelectionScreen } from '@/components/display/alliance-selection-screen';
import { allianceSummary, BlankScreen, ChromaStage, matchClock, MatchScreen, PreviewScreen } from '@/components/display/audience-screen';
import { PreviewBar, ScoreBar } from '@/components/display/display-kit';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { type SoundName } from '@/hooks/use-audio-engine';
import { useFieldCount } from '@/hooks/use-field-count';
import { useLoadedMatch, useMatch, useMatches } from '@/hooks/use-match';
import { getAllianceMembers, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { type AudienceDisplayState, type CompetitionMatch } from '@/types';
import { useProp } from '@inertiajs/react';
import { useEffect, useState } from 'react';

/**
 * The drive teams' screen. Like FTC Live's field display it follows the field
 * rather than the audience: the loaded match's line-up before it starts, the
 * running match with its timer, then the final score until results are posted
 * or the next match is loaded. Alliance selection is the one audience screen
 * it also shows.
 *
 * At a multi-field event a screen can follow one field (like FTC Live's
 * "bind to field"); it then ignores the other field's matches and, while
 * nothing is happening on its own field, shows the next match coming to it.
 */
export function FieldScreen({
    playSound,
    flipped,
    field,
    chromaColor,
}: {
    playSound?: (name: SoundName) => void;
    flipped: boolean;
    field: number | null;
    chromaColor?: string;
}) {
    const fieldCount = useFieldCount();
    const boundField = field && field <= fieldCount && fieldCount > 1 ? field : null;
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound, field: boundField });
    const { data: anyLoadedMatch } = useLoadedMatch(5000);
    const { data: matches = [] } = useMatches(15000);
    const { value: display } = useProp<AudienceDisplayState>('display');
    const [lastPlayedMatchId, setLastPlayedMatchId] = useState<number | null>(null);

    const isOnThisField = (match: CompetitionMatch | null | undefined): match is CompetitionMatch =>
        !!match && (!boundField || match.field === boundField);
    // The match match control has put up for preview counts as loaded too.
    const previewMatch = display?.mode === 'preview' ? matches.find((match) => match.id === display.match_id) : undefined;
    const loadedMatch = isOnThisField(anyLoadedMatch) ? anyLoadedMatch : isOnThisField(previewMatch) ? previewMatch : null;
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
    const resultsPosted = display?.mode === 'results' && display.match_id === lastPlayedMatchId;

    if (!activeMatch && display?.mode === 'alliance_selection') {
        return <AllianceSelectionScreen />;
    }

    const matchIsUp = display?.mode === 'match' && display.match_id === shown?.id;

    if (!activeMatch && !showingFinal && !matchIsUp) {
        if (shown && chromaColor) {
            return (
                <ChromaStage color={chromaColor}>
                    <PreviewBar title={getMatchTitle(shown)} red={getAllianceMembers(shown, 'red')} blue={getAllianceMembers(shown, 'blue')} />
                </ChromaStage>
            );
        }

        return shown ? <PreviewScreen match={shown} /> : <BlankScreen />;
    }

    if (showingFinal && resultsPosted) {
        return <BlankScreen />;
    }

    const teleopSeconds = matchConfig?.timing.teleop ?? 120;

    if (chromaColor) {
        return (
            <ChromaStage color={chromaColor}>
                <ScoreBar
                    title={shown ? getMatchTitle(shown) : ''}
                    red={allianceSummary(shown, 'red')}
                    blue={allianceSummary(shown, 'blue')}
                    flipped={flipped}
                    clock={matchClock(timer, teleopSeconds, shown)}
                />
            </ChromaStage>
        );
    }

    return (
        <MatchScreen
            match={shown}
            timer={timer}
            teleopSeconds={teleopSeconds}
            flipped={flipped}
            waitingLabel={boundField ? 'No more matches on this field' : 'No match loaded'}
            fieldLabel={boundField ? `Field ${boundField}` : shown ? getFieldLabel(shown, fieldCount) : null}
        />
    );
}
