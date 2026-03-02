import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { useScoringPage } from '@/hooks/use-scoring-page';
import { getAllianceColorClasses } from '@/lib/match-utils';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type ScoreType } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring — Stadium', href: '/referee/scoring4' }];

interface SplitTileProps {
    scoreType: ScoreType;
    count: number;
    isPending: boolean;
    accentColor: string;
    onAdd: () => void;
    onRemove: () => void;
}

function SplitTile({ scoreType, count, isPending, accentColor, onAdd, onRemove }: SplitTileProps) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                    {scoreType.name.replace(/_/g, ' ')}
                </span>
                <span className="text-xs font-bold text-white/40">
                    {scoreType.points > 0 ? '+' : ''}{scoreType.points} pts
                </span>
            </div>
            <div className="flex h-20 overflow-hidden rounded-xl">
                {/* Minus half */}
                <button
                    onClick={onRemove}
                    disabled={count === 0 || isPending}
                    className={cn(
                        'flex flex-1 items-center justify-center transition-all select-none',
                        count === 0 || isPending
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : 'bg-rose-900/60 hover:bg-rose-800 active:bg-rose-700 text-rose-300',
                    )}
                >
                    <span className="text-3xl font-black">−</span>
                </button>

                {/* Count center */}
                <div
                    className="flex w-20 shrink-0 flex-col items-center justify-center"
                    style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)` }}
                >
                    <span className={cn('text-4xl font-black tabular-nums', count > 0 ? 'text-white' : 'text-white/30')}>{count}</span>
                </div>

                {/* Plus half */}
                <button
                    onClick={onAdd}
                    disabled={isPending}
                    className={cn(
                        'flex flex-1 items-center justify-center transition-all select-none',
                        isPending
                            ? 'bg-white/5 text-white/20 cursor-not-allowed'
                            : scoreType.points > 0
                                ? 'bg-emerald-900/60 hover:bg-emerald-800 active:bg-emerald-700 text-emerald-300'
                                : scoreType.points < 0
                                    ? 'bg-rose-900/60 hover:bg-rose-800 active:bg-rose-700 text-rose-300'
                                    : 'bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-slate-300',
                    )}
                >
                    <span className="text-3xl font-black">+</span>
                </button>
            </div>
        </div>
    );
}

export default function RefereeScoring4() {
    const {
        selectedAllianceId, setSelectedAllianceId,
        selectedMatchId, setSelectedMatchId,
        match, isLoading, ongoingMatches, alliances,
        colorClasses, sortedGroups, teamsInAlliance,
        getTotalAllianceScore, getAllianceScoreTypeCount, getTeamScoreTypeCount,
        handleAddScore, handleRemoveScore, handleEndMatch, isPending, isEndMatchPending,
    } = useScoringPage();

    const allianceColorName = alliances.find((a) => a?.id === selectedAllianceId)?.color ?? 'gray';
    const accentHex = allianceColorName === 'red' ? '#ef4444' : allianceColorName === 'blue' ? '#3b82f6' : '#6b7280';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scoring — Stadium" />

            <div className="space-y-5">
                {/* Dark header strip */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-900 p-4">
                    <Select value={selectedMatchId?.toString() ?? ''} onValueChange={(v) => setSelectedMatchId(Number(v))}>
                        <SelectTrigger className="w-[180px] border-white/20 bg-white/5 text-white">
                            <SelectValue placeholder="Select match" />
                        </SelectTrigger>
                        <SelectContent>
                            {ongoingMatches.map((m) => (
                                <SelectItem key={m.id} value={m.id.toString()}>Match #{m.number}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex gap-2">
                        {alliances.map((alliance) => {
                            if (!alliance) return null;
                            const cc = getAllianceColorClasses(alliance.color);
                            const isSelected = selectedAllianceId === alliance.id;
                            return (
                                <button
                                    key={alliance.id}
                                    onClick={() => setSelectedAllianceId(alliance.id)}
                                    className={cn(
                                        'rounded-lg px-4 py-2 text-sm font-bold capitalize transition-all',
                                        isSelected
                                            ? cn(cc.bg, 'text-white shadow-lg ring-2 ring-white/30')
                                            : 'bg-white/10 text-white/60 hover:bg-white/20',
                                    )}
                                >
                                    {alliance.color}
                                </button>
                            );
                        })}
                    </div>

                    {selectedAllianceId && (
                        <div className="ml-auto text-right">
                            <p className="text-xs text-white/40 uppercase tracking-widest">Score</p>
                            <p className={cn('text-5xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href="/referee/scoring" className="text-xs text-white/40 hover:text-white/70">
                        ← Layouts
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} />

                {isLoading && (
                    <div className="flex h-40 items-center justify-center rounded-2xl bg-slate-900">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
                    </div>
                )}

                {!isLoading && !match && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white/40">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white/40">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned</p>
                    </div>
                )}

                {match && !selectedAllianceId && match.match_alliances.length > 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white/40">
                        <p>Select an alliance above</p>
                    </div>
                )}

                {/* Score tiles */}
                {match && selectedAllianceId && (
                    <div className="space-y-8 rounded-2xl bg-slate-900 p-5">
                        {sortedGroups.map(([groupName, { alliance, team }]) => {
                            if (alliance.length === 0 && team.length === 0) return null;
                            return (
                                <div key={groupName}>
                                    {groupName !== 'ungrouped' && (
                                        <p className="mb-4 text-sm font-black uppercase tracking-[0.25em]" style={{ color: accentHex }}>
                                            {groupName}
                                        </p>
                                    )}

                                    {alliance.length > 0 && (
                                        <div className="mb-6">
                                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/30">Alliance-wide</p>
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                {alliance.map((scoreType) => (
                                                    <SplitTile
                                                        key={scoreType.id}
                                                        scoreType={scoreType}
                                                        count={getAllianceScoreTypeCount(scoreType.id)}
                                                        isPending={isPending}
                                                        accentColor={accentHex}
                                                        onAdd={() => handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                        onRemove={() => handleRemoveScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {team.length > 0 && teamsInAlliance.map((ma) => (
                                        <div key={ma.id} className="mb-6">
                                            <div className="mb-3 flex items-baseline gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-white/30">{ma.team.name}</p>
                                                <span className="text-sm font-black tabular-nums" style={{ color: accentHex }}>{ma.score} pts</span>
                                            </div>
                                            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                                {team.map((scoreType) => (
                                                    <SplitTile
                                                        key={scoreType.id}
                                                        scoreType={scoreType}
                                                        count={getTeamScoreTypeCount(scoreType.id, ma.team.id)}
                                                        isPending={isPending}
                                                        accentColor={accentHex}
                                                        onAdd={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                        onRemove={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Submit */}
                {match && match.status === 'ongoing' && (
                    <button
                        onClick={() => handleEndMatch(() => { setSelectedMatchId(null); setSelectedAllianceId(null); })}
                        disabled={isEndMatchPending}
                        className={cn(
                            'flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-xl font-black uppercase tracking-widest transition-all',
                            isEndMatchPending
                                ? 'bg-amber-900/50 text-amber-300/50 cursor-not-allowed'
                                : 'bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white shadow-lg shadow-amber-900/50',
                        )}
                    >
                        <CheckCircle className="h-6 w-6" />
                        {isEndMatchPending ? 'Submitting…' : `Submit Match #${match.number}`}
                    </button>
                )}
            </div>
        </AppLayout>
    );
}
