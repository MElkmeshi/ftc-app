import { ScoreTypeIcon } from '@/components/game-look';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { GroupScoreControls } from '@/components/scoring/score-controls';
import { SeatWarning, SubmitScoresPanel } from '@/components/scoring/submit-scores-panel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScoringPage } from '@/hooks/use-scoring-page';
import AppLayout from '@/layouts/app-layout';
import { resolveEventHref } from '@/lib/event';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { LayoutGrid, Minus, Plus, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring — Action Grid', href: '/referee/scoring2' }];

function getAddStyle(points: number): string {
    if (points > 0) return 'bg-emerald-600 hover:bg-emerald-700 text-white';
    if (points < 0) return 'bg-rose-600 hover:bg-rose-700 text-white';
    return 'bg-slate-600 hover:bg-slate-700 text-white';
}

export default function RefereeScoring2() {
    const {
        selectedAllianceId,
        setSelectedAllianceId,
        selectedMatchId,
        setSelectedMatchId,
        match,
        isLoading,
        ongoingMatches,
        alliances,
        colorClasses,
        sortedGroups,
        teamsInAlliance,
        getTotalAllianceScore,
        getAllianceScoreTypeCount,
        getTeamScoreTypeCount,
        handleAddScore,
        handleRemoveScore,
        isPending,
        seatLabel,
        submission,
        setSubmitted,
        isSubmitPending,
        submitError,
        sharingSeatWith,
        unsyncedCount,
    } = useScoringPage();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scoring — Action Grid" />

            <div className="space-y-4">
                {/* Compact top bar */}
                <div className={cn('flex flex-wrap items-center gap-3 rounded-xl border-2 p-4', colorClasses.border, colorClasses.bgLight)}>
                    <div className="flex flex-1 flex-wrap items-center gap-3">
                        <Select value={selectedMatchId?.toString() ?? ''} onValueChange={(v) => setSelectedMatchId(Number(v))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select match" />
                            </SelectTrigger>
                            <SelectContent>
                                {ongoingMatches.map((m) => (
                                    <SelectItem key={m.id} value={m.id.toString()}>
                                        Match #{m.number}
                                    </SelectItem>
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
                            <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">Total</p>
                            <p className={cn('text-4xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href={resolveEventHref('/referee/scoring')} className="text-muted-foreground ml-auto text-xs hover:underline">
                        ← Pick layout
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} showRolePicker />

                {isLoading && (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent" />
                    </div>
                )}

                {!isLoading && !match && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned to Match #{match.number}</p>
                    </div>
                )}

                {match && !selectedAllianceId && match.match_alliances.length > 0 && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed">
                        <LayoutGrid className="h-10 w-10" />
                        <p>Select an alliance above to begin scoring</p>
                    </div>
                )}

                {/* Flat score grid */}
                {match && selectedAllianceId && (
                    <div className="space-y-6">
                        {sortedGroups.map(([groupName, { alliance, team, allianceControls, teamControls }]) => {
                            if (alliance.length === 0 && team.length === 0 && allianceControls.length === 0 && teamControls.length === 0) return null;
                            return (
                                <div key={groupName}>
                                    {groupName !== 'ungrouped' && (
                                        <div className={cn('mb-3 border-l-4 pl-3', colorClasses.border)}>
                                            <h2 className="text-lg font-bold tracking-widest uppercase">{groupName}</h2>
                                        </div>
                                    )}
                                    {selectedAllianceId && (
                                        <GroupScoreControls
                                            allianceControls={allianceControls}
                                            teamControls={teamControls}
                                            allianceId={selectedAllianceId}
                                            teams={teamsInAlliance.map((ma) => ma.team)}
                                            getAllianceCount={getAllianceScoreTypeCount}
                                            getTeamCount={getTeamScoreTypeCount}
                                            onAdd={handleAddScore}
                                            onRemove={handleRemoveScore}
                                            disabled={isPending}
                                            selectedClassName={cn(colorClasses.border, colorClasses.bg, 'text-white')}
                                        />
                                    )}

                                    {/* Alliance-wide score types */}
                                    {alliance.length > 0 && (
                                        <>
                                            <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-widest uppercase">
                                                Alliance-wide
                                            </p>
                                            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                {alliance.map((scoreType) => {
                                                    const count = getAllianceScoreTypeCount(scoreType.id);
                                                    return (
                                                        <div key={scoreType.id} className="bg-card flex flex-col gap-2 rounded-lg border p-3">
                                                            <div className="flex items-start justify-between gap-1">
                                                                <p className="flex items-center gap-1.5 text-xs leading-tight font-semibold">
                                                                    <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                    {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                </p>
                                                                <span className="shrink-0 text-xs font-bold">
                                                                    {scoreType.points > 0 ? '+' : ''}
                                                                    {scoreType.points}
                                                                </span>
                                                            </div>
                                                            <p
                                                                className={cn(
                                                                    'text-center text-3xl font-black tabular-nums',
                                                                    count > 0 ? colorClasses.text : 'text-muted-foreground',
                                                                )}
                                                            >
                                                                {count}
                                                            </p>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    onClick={() =>
                                                                        handleRemoveScore(scoreType.id, {
                                                                            allianceId: selectedAllianceId ?? undefined,
                                                                        })
                                                                    }
                                                                    disabled={count === 0 || isPending}
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-10 flex-1"
                                                                >
                                                                    <Minus className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() =>
                                                                        handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })
                                                                    }
                                                                    disabled={isPending}
                                                                    size="sm"
                                                                    className={cn(
                                                                        'h-10 flex-1',
                                                                        getAddStyle(
                                                                            scoreType.referee === 'penalty' ? -scoreType.points : scoreType.points,
                                                                        ),
                                                                    )}
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
                                    {team.length > 0 &&
                                        teamsInAlliance.map((ma) => (
                                            <div key={ma.id} className="mb-4">
                                                <div className="mb-2 flex items-center justify-between">
                                                    <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
                                                        {ma.team.name}
                                                    </p>
                                                    <span className={cn('text-sm font-black tabular-nums', colorClasses.text)}>{ma.score} pts</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                                    {team.map((scoreType) => {
                                                        const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                                        return (
                                                            <div key={scoreType.id} className="bg-card flex flex-col gap-2 rounded-lg border p-3">
                                                                <div className="flex items-start justify-between gap-1">
                                                                    <p className="flex items-center gap-1.5 text-xs leading-tight font-semibold">
                                                                        <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                        {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                    </p>
                                                                    <span className="shrink-0 text-xs font-bold">
                                                                        {scoreType.points > 0 ? '+' : ''}
                                                                        {scoreType.points}
                                                                    </span>
                                                                </div>
                                                                <p
                                                                    className={cn(
                                                                        'text-center text-3xl font-black tabular-nums',
                                                                        count > 0 ? colorClasses.text : 'text-muted-foreground',
                                                                    )}
                                                                >
                                                                    {count}
                                                                </p>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        onClick={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={count === 0 || isPending}
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-10 flex-1"
                                                                    >
                                                                        <Minus className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={isPending}
                                                                        size="sm"
                                                                        className={cn(
                                                                            'h-10 flex-1',
                                                                            getAddStyle(
                                                                                scoreType.referee === 'penalty'
                                                                                    ? -scoreType.points
                                                                                    : scoreType.points,
                                                                            ),
                                                                        )}
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
                {match && match.status === 'ongoing' && selectedAllianceId && (
                    <>
                        <SeatWarning names={sharingSeatWith} label={seatLabel} />
                        <SubmitScoresPanel
                            matchNumber={match.number}
                            label={seatLabel}
                            submission={submission}
                            pending={isSubmitPending}
                            error={submitError}
                            unsyncedCount={unsyncedCount}
                            onChange={setSubmitted}
                        />
                    </>
                )}
            </div>
        </AppLayout>
    );
}
