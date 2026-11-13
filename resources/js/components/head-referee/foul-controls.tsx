import { formatScoreName } from '@/components/scoring/score-controls';
import { useApi } from '@/hooks/use-api';
import { getAllianceMembers } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type ScoreType } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

type Color = 'red' | 'blue';

interface Target {
    label: string | null;
    teamId?: number;
    allianceId: number;
}

const PLUS_BACKGROUNDS: Record<Color, string> = { red: 'bg-[#ed1c24]', blue: 'bg-[#0066b3]' };

export function isFoul(scoreType: ScoreType): boolean {
    return scoreType.kind === 'count' && (scoreType.referee === 'penalty' || scoreType.awarded_to === 'opponent');
}

function targetsOf(match: CompetitionMatch, color: Color, scoreType: ScoreType): Target[] {
    const members = getAllianceMembers(match, color);
    const receiving = scoreType.awarded_to === 'opponent' ? (color === 'red' ? 'blue' : 'red') : color;
    const allianceId = getAllianceMembers(match, receiving)[0]?.alliance.id;

    if (allianceId === undefined) {
        return [];
    }

    return scoreType.target === 'team'
        ? members.map((member) => ({ label: String(member.team.number), teamId: member.team.id, allianceId }))
        : [{ label: null, allianceId }];
}

function countOf(match: CompetitionMatch, scoreType: ScoreType, target: Target): number {
    return (match.scores ?? []).filter(
        (score) =>
            score.score_type_id === scoreType.id &&
            (target.teamId === undefined ? score.team_id === null && score.alliance_id === target.allianceId : score.team_id === target.teamId),
    ).length;
}

function Stepper({
    color,
    label,
    count,
    disabled,
    onChange,
}: {
    color: Color;
    label: string | null;
    count: number;
    disabled: boolean;
    onChange: (count: number) => void;
}) {
    return (
        <div className="my-1 flex items-center justify-center gap-2">
            {label && <span className="w-14 text-right font-bold tabular-nums">{label}</span>}
            <div className="flex overflow-hidden rounded-md">
                <button
                    type="button"
                    aria-label="Remove one"
                    className="bg-[#dee2e6] px-6 py-1.5 text-xl font-bold disabled:opacity-50"
                    disabled={disabled || count === 0}
                    onClick={() => onChange(count - 1)}
                >
                    −
                </button>
                <span className="w-16 bg-white py-1.5 text-center text-xl tabular-nums">{count}</span>
                <button
                    type="button"
                    aria-label="Add one"
                    className={cn('px-6 py-1.5 text-xl font-bold text-white disabled:opacity-50', PLUS_BACKGROUNDS[color])}
                    disabled={disabled}
                    onClick={() => onChange(count + 1)}
                >
                    +
                </button>
            </div>
        </div>
    );
}

/**
 * The head referee's own foul counters (FTC Live's HR MINOR / MAJOR FOULS):
 * the fouls each alliance committed, with − and + buttons that work before,
 * during and after the match. A foul's points go to the other alliance.
 */
export function FoulControls({ match, scoreTypes, flip }: { match: CompetitionMatch; scoreTypes: ScoreType[]; flip: boolean }) {
    const api = useApi();
    const queryClient = useQueryClient();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fouls = scoreTypes.filter(isFoul);
    const sides: Color[] = flip ? ['blue', 'red'] : ['red', 'blue'];

    if (fouls.length === 0) {
        return null;
    }

    const change = (scoreType: ScoreType, target: Target, count: number) => {
        setSaving(true);
        setError(null);
        api.setScoreCount({
            match_id: match.id,
            score_type_id: scoreType.id,
            count,
            ...(target.teamId === undefined ? { alliance_id: target.allianceId } : { team_id: target.teamId }),
        })
            .then(({ match: updated }) => queryClient.setQueryData(['match', match.id], updated))
            .catch(() => setError('The foul was not saved. Try again.'))
            .finally(() => setSaving(false));
    };

    return (
        <div>
            {fouls.map((scoreType) => (
                <div key={scoreType.id} className="grid grid-cols-[1fr_minmax(8rem,auto)_1fr] items-center gap-2 border-b border-[#dee2e6] py-1">
                    {[sides[0], null, sides[1]].map((color) =>
                        color === null ? (
                            <div key="label" className="text-center font-bold uppercase">
                                HR {formatScoreName(scoreType.name)}
                            </div>
                        ) : (
                            <div key={color}>
                                {targetsOf(match, color, scoreType).map((target) => (
                                    <Stepper
                                        key={target.teamId ?? 'alliance'}
                                        color={color}
                                        label={target.label}
                                        count={countOf(match, scoreType, target)}
                                        disabled={saving}
                                        onChange={(count) => change(scoreType, target, count)}
                                    />
                                ))}
                            </div>
                        ),
                    )}
                </div>
            ))}
            {error && <p className="mt-2 rounded bg-[#f8d7da] px-3 py-1 text-center text-[#842029]">{error}</p>}
        </div>
    );
}
