import { useEliminationBracket } from '@/hooks/use-elimination';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type EliminationSeries } from '@/types';
import { Head } from '@inertiajs/react';
import { Swords, Trophy } from 'lucide-react';

function getAllianceScore(match: CompetitionMatch, color: string): number {
    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + ma.score, 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.score_type?.points || 0), 0);

    return teamScore + allianceWideScore;
}

function getRoundLabel(round: string): string {
    const labels: Record<string, string> = {
        semifinal_1: 'SEMIFINAL 1',
        semifinal_2: 'SEMIFINAL 2',
        final: 'FINAL',
        tiebreaker_semifinal_1: 'TIEBREAKER SF1',
        tiebreaker_semifinal_2: 'TIEBREAKER SF2',
        tiebreaker_final: 'TIEBREAKER FINAL',
    };
    return labels[round] ?? round.toUpperCase();
}

function SeriesBox({ series }: { series: EliminationSeries }) {
    const result = series.result;
    const group1IsWinner = series.winner_alliance_group_id === series.alliance_group1.id;
    const group2IsWinner = series.winner_alliance_group_id === series.alliance_group2.id;

    return (
        <div
            className={cn(
                'rounded-2xl border-2 p-6 transition-all',
                series.status === 'completed' ? 'border-green-500/50 bg-green-500/10' : 'border-white/20 bg-white/5',
            )}
        >
            {/* Round Label */}
            <div className="mb-4 text-center">
                <span
                    className={cn(
                        'rounded-full px-4 py-1 text-lg font-bold',
                        series.round === 'final' || series.round === 'tiebreaker_final'
                            ? 'bg-yellow-400 text-slate-900'
                            : 'bg-white/20 text-white',
                    )}
                >
                    {getRoundLabel(series.round)}
                </span>
            </div>

            {/* Alliance Group 1 */}
            <div
                className={cn(
                    'mb-3 rounded-xl border p-4 transition-all',
                    group1IsWinner ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5',
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold',
                                group1IsWinner ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 text-white',
                            )}
                        >
                            {series.alliance_group1.seed}
                        </div>
                        <div>
                            <div className="text-xl font-bold text-white">
                                #{series.alliance_group1.captain_team.number} & #{series.alliance_group1.picked_team?.number}
                            </div>
                            <div className="text-sm text-white/60">
                                {series.alliance_group1.captain_team.name} & {series.alliance_group1.picked_team?.name}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-white">{result?.group_1_wins ?? 0}</span>
                        {group1IsWinner && <Trophy className="h-6 w-6 text-yellow-400" />}
                    </div>
                </div>
            </div>

            {/* VS Divider */}
            <div className="my-2 text-center text-2xl font-bold text-white/40">VS</div>

            {/* Alliance Group 2 */}
            <div
                className={cn(
                    'mb-4 rounded-xl border p-4 transition-all',
                    group2IsWinner ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/10 bg-white/5',
                )}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className={cn(
                                'flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold',
                                group2IsWinner ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 text-white',
                            )}
                        >
                            {series.alliance_group2.seed}
                        </div>
                        <div>
                            <div className="text-xl font-bold text-white">
                                #{series.alliance_group2.captain_team.number} & #{series.alliance_group2.picked_team?.number}
                            </div>
                            <div className="text-sm text-white/60">
                                {series.alliance_group2.captain_team.name} & {series.alliance_group2.picked_team?.name}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold text-white">{result?.group_2_wins ?? 0}</span>
                        {group2IsWinner && <Trophy className="h-6 w-6 text-yellow-400" />}
                    </div>
                </div>
            </div>

            {/* Match Details */}
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-center text-sm font-semibold text-white/60">MATCHES</div>
                <div className="space-y-2">
                    {series.matches.map((match) => {
                        const redScore = getAllianceScore(match, 'red');
                        const blueScore = getAllianceScore(match, 'blue');
                        const isComplete = match.status === 'completed';
                        const isTiebreaker = match.round?.startsWith('tiebreaker');

                        return (
                            <div
                                key={match.id}
                                className={cn(
                                    'flex items-center justify-between rounded-lg px-4 py-2',
                                    isComplete ? 'bg-white/10' : 'bg-white/5',
                                )}
                            >
                                <span className="text-sm text-white/60">
                                    M#{match.number} {isTiebreaker ? '(TB)' : ''}
                                </span>
                                <div className="flex items-center gap-3">
                                    <span
                                        className={cn(
                                            'text-lg font-bold',
                                            isComplete && redScore > blueScore ? 'text-red-400' : 'text-red-400/60',
                                        )}
                                    >
                                        {redScore}
                                    </span>
                                    <span className="text-white/30">-</span>
                                    <span
                                        className={cn(
                                            'text-lg font-bold',
                                            isComplete && blueScore > redScore ? 'text-blue-400' : 'text-blue-400/60',
                                        )}
                                    >
                                        {blueScore}
                                    </span>
                                </div>
                                <span
                                    className={cn(
                                        'rounded-full px-3 py-0.5 text-xs font-bold uppercase',
                                        isComplete
                                            ? 'bg-green-500/20 text-green-400'
                                            : match.status === 'ongoing'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-white/10 text-white/50',
                                    )}
                                >
                                    {match.status}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default function EliminationBracketDisplay() {
    const { data: bracket, isLoading } = useEliminationBracket(3000);

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Head title="Elimination Bracket" />
                <div className="text-center">
                    <div className="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-8 border-solid border-white border-r-transparent" />
                    <p className="text-2xl text-white">Loading bracket...</p>
                </div>
            </div>
        );
    }

    if (!bracket || bracket.series.length === 0) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Head title="Elimination Bracket" />
                <div className="text-center">
                    <Swords className="mx-auto mb-6 h-24 w-24 text-white/50" />
                    <h1 className="mb-3 text-4xl font-bold text-white">No Elimination Bracket</h1>
                    <p className="text-xl text-white/70">Waiting for elimination matches to be generated...</p>
                </div>
            </div>
        );
    }

    const semifinals = bracket.series.filter(
        (s) => s.round === 'semifinal_1' || s.round === 'semifinal_2',
    );
    const finals = bracket.series.filter(
        (s) => s.round === 'final' || s.round === 'tiebreaker_final',
    );
    const hasSemifinals = semifinals.length > 0;

    // Find the overall winner
    const finalSeries = bracket.series.find((s) => s.round === 'final');
    const overallWinner = finalSeries?.winner;

    return (
        <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
            <Head title="Elimination Bracket" />

            <div className="min-h-screen p-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex items-center justify-center gap-4">
                            <Swords className="h-16 w-16 text-yellow-400" />
                            <h1 className="text-6xl font-bold text-white">Elimination Bracket</h1>
                        </div>
                        {overallWinner && (
                            <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border-2 border-yellow-400 bg-yellow-400/20 px-8 py-4">
                                <Trophy className="h-10 w-10 text-yellow-400" />
                                <span className="text-3xl font-bold text-yellow-400">
                                    CHAMPION: Alliance #{overallWinner.seed} (#{overallWinner.captain_team.number} &{' '}
                                    #{overallWinner.picked_team?.number})
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Bracket */}
                    {hasSemifinals ? (
                        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                            {/* Semifinals */}
                            <div className="space-y-8">
                                {semifinals.map((series) => (
                                    <SeriesBox key={series.id} series={series} />
                                ))}
                            </div>

                            {/* Connector */}
                            <div className="hidden items-center justify-center lg:flex">
                                <div className="text-4xl font-bold text-white/20">&#8594;</div>
                            </div>

                            {/* Finals */}
                            <div className="flex items-center">
                                <div className="w-full space-y-8">
                                    {finals.map((series) => (
                                        <SeriesBox key={series.id} series={series} />
                                    ))}
                                    {finals.length === 0 && (
                                        <div className="rounded-2xl border-2 border-dashed border-white/20 p-12 text-center">
                                            <p className="text-2xl text-white/40">Finals TBD</p>
                                            <p className="mt-2 text-lg text-white/30">Waiting for semifinals...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Just Finals (2-team bracket) */
                        <div className="mx-auto max-w-2xl">
                            {bracket.series.map((series) => (
                                <SeriesBox key={series.id} series={series} />
                            ))}
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-lg text-white/40">
                            {bracket.alliance_groups.length} alliances competing
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
