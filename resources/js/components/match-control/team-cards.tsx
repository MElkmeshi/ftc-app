import { TeamCardBadge } from '@/components/team-card-badge';
import { useApi } from '@/hooks/use-api';
import { getAllianceMembers, getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type TeamCard } from '@/types';
import { router } from '@inertiajs/react';
import { useState } from 'react';

const CHOICES: { value: TeamCard | null; label: string; activeClass: string }[] = [
    { value: null, label: 'None', activeClass: 'bg-primary text-primary-foreground' },
    { value: 'yellow', label: 'Yellow', activeClass: 'bg-yellow-400 text-yellow-950' },
    { value: 'red', label: 'Red', activeClass: 'bg-red-600 text-white' },
];

function earlierYellow(matches: CompetitionMatch[], match: CompetitionMatch, teamId: number): CompetitionMatch | undefined {
    return matches.find(
        (other) =>
            other.id !== match.id &&
            other.status !== 'cancelled' &&
            other.match_alliances?.some((member) => member.team.id === teamId && member.card === 'yellow'),
    );
}

/**
 * The head referee's cards for each team in a match. A red card
 * disqualifies the team from the match; a team already holding a yellow
 * card is flagged, since a second yellow is usually a red.
 */
export function TeamCards({ match, matches }: { match: CompetitionMatch; matches: CompetitionMatch[] }) {
    const api = useApi();
    const [savingTeamId, setSavingTeamId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const setCard = (teamId: number, card: TeamCard | null) => {
        setSavingTeamId(teamId);
        setError(null);
        api.setTeamCard(match.id, teamId, card)
            .then(() => router.reload({ only: ['matches'] }))
            .catch(() => setError('The card was not saved. Try again.'))
            .finally(() => setSavingTeamId(null));
    };

    return (
        <div className="space-y-2">
            <p className="text-sm font-semibold">Cards</p>
            {(['red', 'blue'] as const).map((color) =>
                getAllianceMembers(match, color).map((member) => {
                    const previous = earlierYellow(matches, match, member.team.id);

                    return (
                        <div key={member.id} className="flex flex-wrap items-center gap-2 text-sm">
                            <span
                                className={cn(
                                    'w-16 font-mono font-semibold',
                                    color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
                                )}
                            >
                                {member.team.number}
                            </span>
                            <div
                                className="flex overflow-hidden rounded-md border"
                                role="radiogroup"
                                aria-label={`Card for team ${member.team.number}`}
                            >
                                {CHOICES.map((choice) => (
                                    <button
                                        key={choice.label}
                                        type="button"
                                        role="radio"
                                        aria-checked={(member.card ?? null) === choice.value}
                                        disabled={savingTeamId !== null}
                                        onClick={() => setCard(member.team.id, choice.value)}
                                        className={cn(
                                            'border-l px-2.5 py-1 text-xs font-medium first:border-l-0',
                                            (member.card ?? null) === choice.value ? choice.activeClass : 'hover:bg-accent',
                                        )}
                                    >
                                        {choice.label}
                                    </button>
                                ))}
                            </div>
                            {previous && (
                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                    <TeamCardBadge card="yellow" /> in {getMatchTitle(previous)}
                                </span>
                            )}
                        </div>
                    );
                }),
            )}
            {error && <p className="text-destructive text-xs">{error}</p>}
            <p className="text-muted-foreground text-xs">
                A red card disqualifies the team from this match: no ranking points in qualification, and its alliance loses a playoff match.
            </p>
        </div>
    );
}
