import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { useScoringPage } from '@/hooks/use-scoring-page';
import { getAllianceColorClasses } from '@/lib/match-utils';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, Minus, Plus, LayoutGrid, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring — Action Grid', href: '/referee/scoring2' }];

function getAddStyle(points: number): string {
    if (points > 0) return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    if (points < 0) return 'bg-rose-600 hover:bg-rose-700 text-white';
    return 'bg-slate-600 hover:bg-slate-700 text-white';
}

export default function RefereeScoring2() {
    const {
        selectedAllianceId, setSelectedAllianceId,
        selectedMatchId, setSelectedMatchId,
        match, isLoading, ongoingMatches, alliances,
        colorClasses, sortedGroups, teamsInAlliance,
        getTotalAllianceScore, getAllianceScoreTypeCount, getTeamScoreTypeCount,
        handleAddScore, handleRemoveScore, handleEndMatch, isPending, isEndMatchPending,
    } = useScoringPage();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scoring — Action Grid" />

            <div className="space-y-4">
                {/* Compact top bar */}
                <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border-2 p-4', colorClasses.border, colorClasses.bgLight)}>
                    <div className="flex items-center gap-3 flex-1 flex-wrap">
                        <Select value={selectedMatchId?.toString() ?? ''} onValueChange={(v) => setSelectedMatchId(Number(v))}>
                            <SelectTrigger className="w-[180px]">
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
                                    <Button
                                        key={alliance.id}
                                        onClick={() => setSelectedAllianceId(alliance.id)}
                                        size="sm"
                                        className={cn(
                                            'font-semibold capitalize',
                                            isSelected ? cn(cc.bg, cc.bgHover, 'text-white shadow-md') : 'bg-secondary hover:bg-secondary/80',
                                        )}
                                    >
                                        {alliance.color}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {selectedAllianceId && (
                        <div className="text-right">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Total</p>
                            <p className={cn('text-4xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href="/referee/scoring" className="text-xs text-muted-foreground hover:underline ml-auto">
                        ← Pick layout
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} />

                {isLoading && (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent" />
                    </div>
                )}

                {!isLoading && !match && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-dashed border-2 text-muted-foreground">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-dashed border-2 text-muted-foreground">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned to Match #{match.number}</p>
                    </div>
                )}

                {match && !selectedAllianceId && match.match_alliances.length > 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-dashed border-2 text-muted-foreground">
                        <LayoutGrid className="h-10 w-10" />
                        <p>Select an alliance above to begin scoring</p>
                    </div>
                )}

                {/* Flat score grid */}
                {match && selectedAllianceId && (
                    <div className="space-y-6">
                        {sortedGroups.map(([groupName, { alliance, team }]) => {
                            if (alliance.length === 0 && team.length === 0) return null;
                            return (
                                <div key={groupName}>
                                    {groupName !== 'ungrouped' && (
                                        <div className={cn('mb-3 border-l-4 pl-3', colorClasses.border)}>
                                            <h2 className="text-lg font-bold uppercase tracking-widest">{groupName}</h2>
                                        </div>
                                    )}

                                    {/* Alliance-wide score types */}
                                    {alliance.length > 0 && (
                                        <>
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alliance-wide</p>
                                            <div className="mb-4 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                                {alliance.map((scoreType) => {
                                                    const count = getAllianceScoreTypeCount(scoreType.id);
                                                    return (
                                                        <div key={scoreType.id} className="rounded-lg border bg-card p-3 flex flex-col gap-2">
                                                            <div className="flex items-start justify-between gap-1">
                                                                <p className="text-xs font-semibold leading-tight">{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                                <span className="text-xs font-bold shrink-0">{scoreType.points > 0 ? '+' : ''}{scoreType.points}</span>
                                                            </div>
                                                            <p className={cn('text-center text-3xl font-black tabular-nums', count > 0 ? colorClasses.text : 'text-muted-foreground')}>{count}</p>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    onClick={() => handleRemoveScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                                    disabled={count === 0 || isPending}
                                                                    size="sm" variant="outline" className="flex-1 h-10"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() => handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                                    disabled={isPending}
                                                                    size="sm" className={cn('flex-1 h-10', getAddStyle(scoreType.points))}
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}

                                    {/* Per-team score types */}
                                    {team.length > 0 && teamsInAlliance.map((ma) => (
                                        <div key={ma.id} className="mb-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{ma.team.name}</p>
                                                <span className={cn('text-sm font-black tabular-nums', colorClasses.text)}>{ma.score} pts</span>
                                            </div>
                                            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                                                {team.map((scoreType) => {
                                                    const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                                    return (
                                                        <div key={scoreType.id} className="rounded-lg border bg-card p-3 flex flex-col gap-2">
                                                            <div className="flex items-start justify-between gap-1">
                                                                <p className="text-xs font-semibold leading-tight">{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                                <span className="text-xs font-bold shrink-0">{scoreType.points > 0 ? '+' : ''}{scoreType.points}</span>
                                                            </div>
                                                            <p className={cn('text-center text-3xl font-black tabular-nums', count > 0 ? colorClasses.text : 'text-muted-foreground')}>{count}</p>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    onClick={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                                    disabled={count === 0 || isPending}
                                                                    size="sm" variant="outline" className="flex-1 h-10"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                                    disabled={isPending}
                                                                    size="sm" className={cn('flex-1 h-10', getAddStyle(scoreType.points))}
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
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
                    <div className="flex items-center justify-between rounded-xl border-2 border-amber-500/50 bg-amber-50 p-4 dark:bg-amber-950/30">
                        <div>
                            <p className="font-bold">Submit Match #{match.number}</p>
                            <p className="text-sm text-muted-foreground">Finalizes scoring and ends the match</p>
                        </div>
                        <Button
                            onClick={() => handleEndMatch(() => { setSelectedMatchId(null); setSelectedAllianceId(null); })}
                            disabled={isEndMatchPending}
                            className="bg-amber-600 hover:bg-amber-500 text-white"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {isEndMatchPending ? 'Submitting…' : 'Submit'}
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
