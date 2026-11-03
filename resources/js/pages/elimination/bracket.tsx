import { getAllianceScore } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type AllianceGroup, type CompetitionMatch, type EliminationBracket, type EliminationSeries } from '@/types';
import { Head, useProp } from '@inertiajs/react';
import { Swords, Trophy } from 'lucide-react';
import { memo, useMemo } from 'react';

const ROUND_LABELS: Record<string, string> = {
    semifinal_1: 'Semifinal 1',
    semifinal_2: 'Semifinal 2',
    final: 'Final',
    tiebreaker_semifinal_1: 'Tiebreaker · SF1',
    tiebreaker_semifinal_2: 'Tiebreaker · SF2',
    tiebreaker_final: 'Tiebreaker · Final',
};

type SeriesPhase = 'upcoming' | 'in_progress' | 'live' | 'tiebreaker' | 'complete';

const PHASE_STYLES: Record<SeriesPhase, { label: string; className: string }> = {
    upcoming: { label: 'Upcoming', className: 'bg-white/10 text-white/60' },
    in_progress: { label: 'In progress', className: 'bg-sky-400/15 text-sky-300' },
    live: { label: 'Live', className: 'bg-yellow-400/20 text-yellow-300' },
    tiebreaker: { label: 'Tiebreaker needed', className: 'bg-orange-400/20 text-orange-300' },
    complete: { label: 'Complete', className: 'bg-emerald-400/15 text-emerald-300' },
};

/**
 * Derived from the matches rather than the stored series status, which only
 * changes when an operator checks for a winner and so lags what's on the field.
 */
function getSeriesPhase(series: EliminationSeries): SeriesPhase {
    if (series.winner_alliance_group_id !== null) {
        return 'complete';
    }

    if (series.matches.some((match) => match.status === 'ongoing')) {
        return 'live';
    }

    const completed = series.matches.filter((match) => match.status === 'completed').length;
    const isTied = (series.result?.group_1_wins ?? 0) === (series.result?.group_2_wins ?? 0);

    if (completed > 0 && completed === series.matches.length) {
        return isTied ? 'tiebreaker' : 'in_progress';
    }

    return completed > 0 ? 'in_progress' : 'upcoming';
}

/** Alliances swap red/blue between matches, so look up the side this group actually played. */
function getGroupSide(match: CompetitionMatch, groupId: number): 'red' | 'blue' | null {
    const color = match.match_alliances.find((member) => member.alliance_group_id === groupId)?.alliance?.color;

    return color === 'red' || color === 'blue' ? color : null;
}

function isFinalRound(round: string): boolean {
    return round === 'final' || round === 'tiebreaker_final';
}

const AllianceRow = memo(function AllianceRow({
    group,
    wins,
    isWinner,
    isEliminated,
}: {
    group: AllianceGroup;
    wins: number;
    isWinner: boolean;
    isEliminated: boolean;
}) {
    const teams = [group.captain_team, group.picked_team].filter((team) => team !== null);

    return (
        <div
            className={cn(
                'flex items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                isWinner ? 'bg-yellow-400/15 ring-1 ring-yellow-400/60' : 'bg-white/5',
                isEliminated && 'opacity-45',
            )}
        >
            <div
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-full text-lg font-bold',
                    isWinner ? 'bg-yellow-400 text-slate-900' : 'bg-white/15 text-white',
                )}
                title={`Seed ${group.seed}`}
            >
                {group.seed}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xl font-bold text-white tabular-nums">{teams.map((team) => `#${team.number}`).join('  ·  ')}</div>
                <div className="truncate text-sm text-white/55">{teams.map((team) => team.name).join(' & ')}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
                {isWinner && <Trophy className="size-6 text-yellow-400" />}
                <span className={cn('w-8 text-right text-4xl font-black tabular-nums', isWinner ? 'text-yellow-300' : 'text-white')}>{wins}</span>
            </div>
        </div>
    );
});

/** Shows the score as "first alliance – second alliance", matching the row order above, each in the colour it played. */
function MatchChip({ match, group1Id, group2Id }: { match: CompetitionMatch; group1Id: number; group2Id: number }) {
    const isComplete = match.status === 'completed';
    const isLive = match.status === 'ongoing';
    const isTiebreaker = match.round?.startsWith('tiebreaker') ?? false;
    const sides = [getGroupSide(match, group1Id), getGroupSide(match, group2Id)];
    const scores = sides.map((side) => (side ? getAllianceScore(match, side) : 0));

    return (
        <div
            className={cn(
                'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm',
                isLive ? 'bg-yellow-400/10 ring-1 ring-yellow-400/50' : 'bg-white/5',
            )}
        >
            <span className="shrink-0 font-medium text-white/50">
                M{match.number}
                {isTiebreaker && <span className="ml-1 text-yellow-300/80">TB</span>}
            </span>
            {match.status === 'upcoming' ? (
                <span className="text-white/35">—</span>
            ) : (
                <span className="font-bold tabular-nums">
                    {scores.map((score, index) => {
                        const isLoser = isComplete && score <= scores[1 - index];
                        const colorClass = sides[index] === 'blue' ? 'text-blue-400' : 'text-red-400';

                        return (
                            <span key={index}>
                                {index === 1 && <span className="px-1.5 text-white/30">–</span>}
                                <span className={cn(colorClass, isLoser && 'opacity-50')}>{score}</span>
                            </span>
                        );
                    })}
                </span>
            )}
            {isLive && <span className="size-2 shrink-0 animate-pulse rounded-full bg-yellow-400" aria-label="Live" />}
        </div>
    );
}

const SeriesCard = memo(function SeriesCard({ series }: { series: EliminationSeries }) {
    const phase = getSeriesPhase(series);
    const isComplete = phase === 'complete';
    const group1IsWinner = series.winner_alliance_group_id === series.alliance_group1.id;
    const group2IsWinner = series.winner_alliance_group_id === series.alliance_group2.id;
    const status = PHASE_STYLES[phase];
    const isFinal = isFinalRound(series.round);

    return (
        <div
            className={cn(
                'w-full rounded-2xl border bg-slate-900/60 p-4 shadow-xl backdrop-blur-sm',
                isFinal ? 'border-yellow-400/40' : 'border-white/15',
                phase === 'live' && 'border-yellow-400/60',
            )}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className={cn('text-lg font-bold tracking-wide uppercase', isFinal ? 'text-yellow-300' : 'text-white/85')}>
                    {ROUND_LABELS[series.round] ?? series.round}
                </span>
                <span className={cn('rounded-full px-3 py-0.5 text-xs font-bold tracking-wider uppercase', status.className)}>{status.label}</span>
            </div>

            <div className="space-y-2">
                <AllianceRow
                    group={series.alliance_group1}
                    wins={series.result?.group_1_wins ?? 0}
                    isWinner={group1IsWinner}
                    isEliminated={isComplete && !group1IsWinner}
                />
                <AllianceRow
                    group={series.alliance_group2}
                    wins={series.result?.group_2_wins ?? 0}
                    isWinner={group2IsWinner}
                    isEliminated={isComplete && !group2IsWinner}
                />
            </div>

            {series.matches.length > 0 && (
                <div className="mt-3 flex gap-2">
                    {series.matches.map((match) => (
                        <MatchChip key={match.id} match={match} group1Id={series.alliance_group1.id} group2Id={series.alliance_group2.id} />
                    ))}
                </div>
            )}
        </div>
    );
});

function FinalPlaceholder() {
    return (
        <div className="w-full rounded-2xl border-2 border-dashed border-white/15 p-4">
            <div className="mb-3 text-lg font-bold tracking-wide text-yellow-300/60 uppercase">Final</div>
            <div className="space-y-2">
                {['Winner of Semifinal 1', 'Winner of Semifinal 2'].map((label) => (
                    <div key={label} className="flex h-[68px] items-center rounded-xl bg-white/5 px-4 text-lg text-white/40">
                        {label}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Bracket lines joining the two semifinals (top and bottom) to the final (middle). */
function BracketConnector() {
    return (
        <div className="relative hidden w-16 shrink-0 self-stretch lg:block" aria-hidden>
            <div className="absolute top-1/4 bottom-1/4 left-0 w-1/2 rounded-r-lg border-y-2 border-r-2 border-white/20" />
            <div className="absolute top-1/2 right-0 left-1/2 border-t-2 border-white/20" />
        </div>
    );
}

export default function EliminationBracketDisplay() {
    // Live prop: the server reloads it whenever the bracket, a match status, or a
    // score changes (see routes/web.php), so there's no polling here.
    const { value: bracket } = useProp<EliminationBracket>('bracket');

    // Hooks must run unconditionally on every render -- compute these before the
    // early return below instead of after it.
    const series = useMemo(() => bracket?.series ?? [], [bracket]);
    const semifinals = useMemo(() => series.filter((s) => s.round === 'semifinal_1' || s.round === 'semifinal_2'), [series]);
    const finals = useMemo(() => series.filter((s) => isFinalRound(s.round)), [series]);
    const champion = useMemo(() => series.find((s) => s.round === 'final')?.winner ?? null, [series]);

    if (!bracket || bracket.series.length === 0) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                <Head title="Elimination Bracket" />
                <div className="text-center">
                    <Swords className="mx-auto mb-6 size-24 text-white/40" />
                    <h1 className="mb-3 text-4xl font-bold text-white">No Elimination Bracket</h1>
                    <p className="text-xl text-white/60">Waiting for elimination matches to be generated…</p>
                </div>
            </div>
        );
    }

    const hasSemifinals = semifinals.length > 0;

    return (
        <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-8 py-6">
            <Head title="Elimination Bracket" />

            <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Swords className="size-10 text-yellow-400" />
                    <h1 className="text-4xl font-bold text-white">Elimination Bracket</h1>
                </div>
                {champion ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/70 bg-yellow-400/15 px-5 py-2.5">
                        <Trophy className="size-8 text-yellow-400" />
                        <div>
                            <div className="text-xs font-bold tracking-widest text-yellow-300/80 uppercase">Champions · Alliance {champion.seed}</div>
                            <div className="text-2xl font-bold text-yellow-300 tabular-nums">
                                #{champion.captain_team.number}
                                {champion.picked_team && ` · #${champion.picked_team.number}`}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-lg text-white/50">{bracket.alliance_groups.length} alliances competing</div>
                )}
            </header>

            <main className="flex flex-1 items-center justify-center">
                {hasSemifinals ? (
                    <div className="flex w-full max-w-7xl flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:gap-0">
                        <div className="flex min-w-0 flex-1 flex-col gap-6 lg:gap-10">
                            {semifinals.map((s) => (
                                <SeriesCard key={s.id} series={s} />
                            ))}
                        </div>
                        <BracketConnector />
                        <div className="flex min-w-0 flex-1 flex-col gap-6">
                            {finals.length > 0 ? finals.map((s) => <SeriesCard key={s.id} series={s} />) : <FinalPlaceholder />}
                        </div>
                    </div>
                ) : (
                    <div className="flex w-full max-w-2xl flex-col gap-6">
                        {series.map((s) => (
                            <SeriesCard key={s.id} series={s} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
