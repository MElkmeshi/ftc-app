import { ScoreTypeIcon } from '@/components/game-look';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { GroupScoreControls } from '@/components/scoring/score-controls';
import { SeatWarning, SubmitScoresPanel } from '@/components/scoring/submit-scores-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useScoringPage } from '@/hooks/use-scoring-page';
import AppLayout from '@/layouts/app-layout';
import { resolveEventHref } from '@/lib/event';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Minus, Plus, Star, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring Only', href: '/referee/scoring5' }];

export default function RefereeScoringOnly() {
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
    } = useScoringPage({ role: 'scoring' });

    // Only positive-point score types
    const filteredGroups = sortedGroups
        .map(
            ([groupName, { alliance, team, allianceControls, teamControls }]) =>
                [
                    groupName,
                    {
                        alliance: alliance.filter((st) => st.points > 0),
                        team: team.filter((st) => st.points > 0),
                        allianceControls,
                        teamControls,
                    },
                ] as const,
        )
        .filter(
            ([, { alliance, team, allianceControls, teamControls }]) =>
                alliance.length > 0 || team.length > 0 || allianceControls.length > 0 || teamControls.length > 0,
        );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scoring Only" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/40">
                    <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-emerald-600" />
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">Scoring Points Only</span>
                    </div>

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
                                        isSelected ? cn(cc.bg, cc.bgHover, 'text-white') : 'bg-secondary hover:bg-secondary/80',
                                    )}
                                >
                                    {alliance.color}
                                </Button>
                            );
                        })}
                    </div>

                    {selectedAllianceId && (
                        <div className="ml-auto text-right">
                            <p className="text-muted-foreground text-xs">Alliance Total</p>
                            <p className={cn('text-4xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href={resolveEventHref('/referee/scoring')} className="text-muted-foreground text-xs hover:underline">
                        ← Layouts
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} showRolePicker />

                {isLoading && (
                    <div className="flex h-40 items-center justify-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-current border-r-transparent" />
                    </div>
                )}

                {!isLoading && !match && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned to Match #{match.number}</p>
                    </div>
                )}

                {match && !selectedAllianceId && match.match_alliances.length > 0 && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2">
                        <p>Select an alliance above</p>
                    </div>
                )}

                {match && selectedAllianceId && filteredGroups.length === 0 && (
                    <div className="text-muted-foreground flex h-40 flex-col items-center justify-center gap-2">
                        <Star className="h-10 w-10" />
                        <p>No positive-point score types configured</p>
                    </div>
                )}

                {match &&
                    selectedAllianceId &&
                    filteredGroups.map(([groupName, { alliance, team, allianceControls, teamControls }]) => (
                        <div key={groupName} className="space-y-4">
                            {groupName !== 'ungrouped' && (
                                <div className="border-l-4 border-emerald-500 pl-3">
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

                            {alliance.length > 0 && (
                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">Alliance-wide</p>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {alliance.map((scoreType) => {
                                                const count = getAllianceScoreTypeCount(scoreType.id);
                                                return (
                                                    <Card key={scoreType.id} className="overflow-hidden border-emerald-100 dark:border-emerald-900">
                                                        <CardContent className="p-4">
                                                            <div className="mb-3 flex items-start justify-between">
                                                                <div>
                                                                    <p className="flex items-center gap-1.5 text-sm leading-tight font-medium">
                                                                        <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                        {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xl font-black text-emerald-600">
                                                                        +{scoreType.points} pts
                                                                    </p>
                                                                </div>
                                                                {count > 0 && (
                                                                    <Badge className="bg-emerald-100 px-2 py-1 text-base text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                                        {count}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    onClick={() =>
                                                                        handleRemoveScore(scoreType.id, {
                                                                            allianceId: selectedAllianceId ?? undefined,
                                                                        })
                                                                    }
                                                                    disabled={count === 0 || isPending}
                                                                    size="lg"
                                                                    variant="outline"
                                                                    className="flex-1"
                                                                >
                                                                    <Minus className="h-5 w-5" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() =>
                                                                        handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })
                                                                    }
                                                                    disabled={isPending}
                                                                    size="lg"
                                                                    className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                                                >
                                                                    <Plus className="h-5 w-5" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {team.length > 0 &&
                                teamsInAlliance.map((ma) => (
                                    <Card key={ma.id}>
                                        <CardContent className="pt-5">
                                            <div className="mb-3 flex items-center justify-between border-b pb-3">
                                                <h3 className="text-xl font-bold">{ma.team.name}</h3>
                                                <div className="text-right">
                                                    <p className="text-muted-foreground text-xs">Team Score</p>
                                                    <p className="text-2xl font-black">{ma.score}</p>
                                                </div>
                                            </div>
                                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {team.map((scoreType) => {
                                                    const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                                    return (
                                                        <Card
                                                            key={scoreType.id}
                                                            className="overflow-hidden border-emerald-100 dark:border-emerald-900"
                                                        >
                                                            <CardContent className="p-4">
                                                                <div className="mb-3 flex items-start justify-between">
                                                                    <div>
                                                                        <p className="flex items-center gap-1.5 text-sm leading-tight font-medium">
                                                                            <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                            {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                        </p>
                                                                        <p className="mt-0.5 text-xl font-black text-emerald-600">
                                                                            +{scoreType.points} pts
                                                                        </p>
                                                                    </div>
                                                                    {count > 0 && (
                                                                        <Badge className="bg-emerald-100 px-2 py-1 text-base text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                                                            {count}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        onClick={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={count === 0 || isPending}
                                                                        size="lg"
                                                                        variant="outline"
                                                                        className="flex-1"
                                                                    >
                                                                        <Minus className="h-5 w-5" />
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={isPending}
                                                                        size="lg"
                                                                        className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                                                                    >
                                                                        <Plus className="h-5 w-5" />
                                                                    </Button>
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                        </div>
                    ))}

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
