import { useGroups } from '@/hooks/use-groups';
import { useMatch, useScoreTypes } from '@/hooks/use-match';
import { bs } from '@/lib/bootstrap';
import { eventUrl } from '@/lib/event';
import { getMatchTitle, isTestMatch } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { AllianceSheet } from '@/pages/matches/sheet';
import { type CompetitionMatch } from '@/types';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

const SIDES = [
    { value: 'red', label: 'Red' },
    { value: 'blue', label: 'Blue' },
    { value: 'both', label: 'Both' },
] as const;

type Side = (typeof SIDES)[number]['value'];

function optionLabel(match: CompetitionMatch): string {
    if (isTestMatch(match) || match.type === 'elimination') {
        return getMatchTitle(match);
    }

    return `${match.type === 'practice' ? 'P' : 'Q'}${match.number}`;
}

export function ScoresheetsTab({ matches }: { matches: CompetitionMatch[] }) {
    const [matchId, setMatchId] = useState<number | null>(null);
    const [playoffOnly, setPlayoffOnly] = useState(false);
    const [side, setSide] = useState<Side>('both');
    const { data: match } = useMatch(matchId, 5000);
    const { data: scoreTypes = [] } = useScoreTypes();
    const { data: groups = [] } = useGroups();
    const options = matches.filter((candidate) => !playoffOnly || candidate.type === 'elimination');
    const scoreTypesById = new Map(scoreTypes.map((scoreType) => [scoreType.id, scoreType]));
    const colors = side === 'both' ? ['blue', 'red'] : [side];

    return (
        <div>
            <div className="my-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2">
                    <label htmlFor="scoresheet-match">Match:</label>
                    <select
                        id="scoresheet-match"
                        className={cn(bs.formSelect, 'w-auto')}
                        value={matchId ?? ''}
                        onChange={(e) => setMatchId(e.target.value ? Number(e.target.value) : null)}
                    >
                        <option value="">Select Match</option>
                        {options.map((option) => (
                            <option key={option.id} value={option.id}>
                                {optionLabel(option)}
                            </option>
                        ))}
                    </select>
                </span>
                <label className="flex items-center gap-1">
                    Playoff Only:
                    <input type="checkbox" className="size-4" checked={playoffOnly} onChange={(e) => setPlayoffOnly(e.target.checked)} />
                </label>
                <span className="flex items-center gap-3">
                    {SIDES.map((option) => (
                        <label key={option.value} className="flex items-center gap-1">
                            <input type="radio" name="scoresheet-side" checked={side === option.value} onChange={() => setSide(option.value)} />
                            {option.label}
                        </label>
                    ))}
                </span>
                {matchId !== null && (
                    <span className="ml-auto flex gap-2">
                        <Link href={eventUrl(`/matches/${matchId}/edit`)} className={cn(bs.btnSecondary, bs.btnSm)}>
                            Edit Scores
                        </Link>
                        <Link href={eventUrl(`/matches/${matchId}/history`)} className={cn(bs.btnSecondary, bs.btnSm)}>
                            History
                        </Link>
                    </span>
                )}
            </div>
            {match && matchId === match.id && (
                <div className="-mx-3 flex flex-wrap justify-center">
                    {colors.map((color) => (
                        <AllianceSheet key={color} match={match} color={color} scoreTypes={scoreTypesById} groups={groups} />
                    ))}
                </div>
            )}
        </div>
    );
}
