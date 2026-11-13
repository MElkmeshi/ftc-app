import { formatScoreName } from '@/components/scoring/score-controls';
import { useApi } from '@/hooks/use-api';
import AppLayout from '@/layouts/app-layout';
import { getApiErrorMessage } from '@/lib/api-error';
import { bs } from '@/lib/bootstrap';
import { eventUrl } from '@/lib/event';
import { getAllianceMembers, getAllianceScore, getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type MatchAlliance, type ScoreType } from '@/types';
import { Head, Link, router, usePage, useProp } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const ALLIANCES = ['red', 'blue'] as const;
type Color = (typeof ALLIANCES)[number];

const HEADER_BACKGROUNDS: Record<Color, string> = { red: 'bg-[#ED1C24]', blue: 'bg-[#0066B3]' };
const STATE_LABELS: Record<string, string> = { upcoming: 'Unplayed', ongoing: 'Running', completed: 'Committed', cancelled: 'Cancelled' };

interface Target {
    teamId?: number;
    allianceId: number;
}

function countOf(match: CompetitionMatch, scoreType: ScoreType, target: Target): number {
    return (match.scores ?? []).filter(
        (score) =>
            score.score_type_id === scoreType.id &&
            (target.teamId === undefined ? score.team_id === null && score.alliance_id === target.allianceId : score.team_id === target.teamId),
    ).length;
}

function CountInput({
    scoreType,
    count,
    disabled,
    onSave,
}: {
    scoreType: ScoreType;
    count: number;
    disabled: boolean;
    onSave: (count: number) => void;
}) {
    const [draft, setDraft] = useState<string | null>(null);

    if (scoreType.kind !== 'count') {
        return (
            <input type="checkbox" className="size-5" checked={count > 0} disabled={disabled} onChange={(e) => onSave(e.target.checked ? 1 : 0)} />
        );
    }

    const commit = () => {
        const wanted = Math.max(0, Math.min(999, Math.round(Number(draft))));

        if (draft !== null && Number.isFinite(wanted) && wanted !== count) {
            onSave(wanted);
        }

        setDraft(null);
    };

    return (
        <input
            type="number"
            min={0}
            max={999}
            className={cn(bs.formControl, 'w-20 text-center')}
            value={draft ?? count}
            disabled={disabled}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
    );
}

function AllianceEditor({
    match,
    color,
    groups,
    saving,
    onSave,
}: {
    match: CompetitionMatch;
    color: Color;
    groups: [string, ScoreType[]][];
    saving: boolean;
    onSave: (scoreType: ScoreType, target: Target, count: number) => void;
}) {
    const members: MatchAlliance[] = getAllianceMembers(match, color);
    const allianceId = members[0]?.alliance.id;

    if (allianceId === undefined) {
        return null;
    }

    return (
        <div className="w-full px-3 lg:w-6/12">
            <div
                className={cn('mb-2 flex items-center justify-between px-3 py-1 text-2xl font-bold text-white capitalize', HEADER_BACKGROUNDS[color])}
            >
                <span>{color} Alliance</span>
                <span className="tabular-nums">{getAllianceScore(match, color)}</span>
            </div>
            <table className={cn(bs.table, 'text-center')}>
                <thead>
                    <tr>
                        <th className="text-left">Score</th>
                        <th>Points</th>
                        {members.map((member) => (
                            <th key={member.id}>{member.team.number}</th>
                        ))}
                        <th>Alliance</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map(([name, scoreTypes]) => (
                        <FragmentRows key={name} title={name} columns={members.length + 3}>
                            {scoreTypes.map((scoreType) => (
                                <tr key={scoreType.id}>
                                    <td className="text-left capitalize">{formatScoreName(scoreType.name)}</td>
                                    <td className="tabular-nums">
                                        {scoreType.awarded_to === 'opponent' ? `+${scoreType.points} to opponent` : scoreType.points}
                                    </td>
                                    {members.map((member) => (
                                        <td key={member.id}>
                                            {scoreType.target === 'team' && (
                                                <CountInput
                                                    scoreType={scoreType}
                                                    count={countOf(match, scoreType, { teamId: member.team.id, allianceId })}
                                                    disabled={saving}
                                                    onSave={(count) => onSave(scoreType, { teamId: member.team.id, allianceId }, count)}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td>
                                        {scoreType.target === 'alliance' && (
                                            <CountInput
                                                scoreType={scoreType}
                                                count={countOf(match, scoreType, { allianceId })}
                                                disabled={saving}
                                                onSave={(count) => onSave(scoreType, { allianceId }, count)}
                                            />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </FragmentRows>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FragmentRows({ title, columns, children }: { title: string; columns: number; children: React.ReactNode }) {
    return (
        <>
            <tr>
                <th colSpan={columns} className="bg-[#e9ecef] text-left">
                    {title}
                </th>
            </tr>
            {children}
        </>
    );
}

export default function MatchScoreEdit() {
    const { scoreTypes } = usePage<{ scoreTypes: ScoreType[] }>().props;
    const { value: match } = useProp<CompetitionMatch>('match');
    const api = useApi();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const groups = useMemo(() => {
        const byGroup = new Map<string, { order: number; scoreTypes: ScoreType[] }>();

        for (const scoreType of scoreTypes) {
            const name = scoreType.group?.name ?? 'Other';
            const entry = byGroup.get(name) ?? { order: scoreType.group?.display_order ?? Number.MAX_SAFE_INTEGER, scoreTypes: [] };
            entry.scoreTypes.push(scoreType);
            byGroup.set(name, entry);
        }

        return [...byGroup.entries()]
            .sort(([, a], [, b]) => a.order - b.order)
            .map(([name, group]): [string, ScoreType[]] => [name, group.scoreTypes]);
    }, [scoreTypes]);

    if (!match) {
        return null;
    }

    const title = getMatchTitle(match);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Match Control', href: '/match-control' },
        { title: 'Score Edit', href: `/matches/${match.id}/edit` },
    ];

    const run = (action: () => Promise<unknown>, after?: () => void) => {
        setSaving(true);
        setError(null);
        action()
            .then(() => (after ? after() : router.reload({ only: ['match'] })))
            .catch((e) => setError(getApiErrorMessage(e)))
            .finally(() => setSaving(false));
    };

    const save = (scoreType: ScoreType, target: Target, count: number) => {
        const siblings =
            scoreType.kind === 'choice' && count > 0
                ? scoreTypes.filter(
                      (other) => other.id !== scoreType.id && other.choice_set === scoreType.choice_set && other.target === scoreType.target,
                  )
                : [];
        const payload = (type: ScoreType, wanted: number) => ({
            match_id: match.id,
            score_type_id: type.id,
            count: wanted,
            ...(target.teamId === undefined ? { alliance_id: target.allianceId } : { team_id: target.teamId }),
        });

        run(async () => {
            for (const sibling of siblings) {
                if (countOf(match, sibling, target) > 0) {
                    await api.setScoreCount(payload(sibling, 0));
                }
            }

            await api.setScoreCount(payload(scoreType, count));
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Score Edit · ${title}`} />
            <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="ml-auto flex flex-wrap gap-2">
                        <Link href={eventUrl(`/matches/${match.id}/history`)} className={bs.btnSecondary}>
                            View History
                        </Link>
                        <Link href={eventUrl(`/matches/${match.id}`)} className={bs.btnSecondary}>
                            Scoresheet
                        </Link>
                        {match.status === 'upcoming' && (
                            <button
                                type="button"
                                className={bs.btnSuccess}
                                disabled={saving}
                                onClick={() =>
                                    confirm(`Commit ${title} with these scores? It will count as played.`) &&
                                    run(
                                        () => api.commitUnplayedMatch(match.id),
                                        () => router.visit(eventUrl('/match-control')),
                                    )
                                }
                            >
                                Commit
                            </button>
                        )}
                        {match.status === 'completed' && (
                            <button
                                type="button"
                                className={bs.btnSuccess}
                                disabled={saving}
                                onClick={() => run(() => api.setAudienceDisplay('results', match.id))}
                            >
                                Post Results
                            </button>
                        )}
                    </span>
                </div>
                <h2 className={cn(bs.h2, 'text-center')}>Score Edit</h2>
                <h4 className={cn(bs.h4, 'text-center')}>
                    {title} · {STATE_LABELS[match.status] ?? match.status}
                </h4>
                {match.status === 'upcoming' && (
                    <p className="mb-3 text-center">Enter this match&apos;s scores by hand, then press Commit to count it as played.</p>
                )}
                {error && <div className="mb-3 rounded-md border border-[#f1aeb5] bg-[#f8d7da] p-3 text-[#58151c]">{error}</div>}
                <div className="-mx-3 flex flex-wrap">
                    {ALLIANCES.map((color) => (
                        <AllianceEditor key={color} match={match} color={color} groups={groups} saving={saving} onSave={save} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
