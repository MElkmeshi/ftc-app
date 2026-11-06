import { ScoreTypeIcon } from '@/components/game-look';
import { MatchTimerBanner } from '@/components/match-timer-banner';
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
import { AlertTriangle, Minus, Plus, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Fouls Only', href: '/referee/scoring6' }];

export default function RefereeFoulsOnly() {
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
    } = useScoringPage({ role: 'penalty' });

    // This layout is the alliance's penalty referee: only the fouls it calls (the − / + ones).
    const filteredGroups = sortedGroups
        .map(([groupName, { alliance, team }]) => [groupName, { alliance, team }] as const)
        .filter(([, { alliance, team }]) => alliance.length > 0 || team.length > 0);

    // Total fouls applied to the selected alliance
    const totalFoulPoints = (() => {
        if (!match || !selectedAllianceId) return 0;
        return (match.scores ?? [])
            .filter((s) => {
                const pts = s.points ?? s.score_type?.points ?? 0;
                if (pts >= 0) return false;
                // alliance-wide foul
                if (!s.team_id && s.alliance_id === selectedAllianceId) return true;
                // team foul (team belongs to this alliance)
                if (s.team_id) {
                    return teamsInAlliance.some((ma) => ma.team.id === s.team_id);
                }
                return false;
            })
            .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0);
    })();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Fouls Only" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/40">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-rose-600" />
                        <span className="font-bold text-rose-700 dark:text-rose-400">Fouls &amp; Penalties Only</span>
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
                                        isSelected ? cn(cc.bg, cc.bgHover, 'text-white') : 'bg-accent hover:bg-accent/80',
                                    )}
                                >
                                    {alliance.color}
                                </Button>
                            );
                        })}
                    </div>

                    {selectedAllianceId && (
                        <div className="ml-auto text-right">
                            <div className="flex items-end gap-4">
                                <div>
                                    <p className="text-muted-foreground text-xs">Fouls</p>
                                    <p className="text-3xl font-black text-rose-600 tabular-nums">{totalFoulPoints}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground text-xs">Total</p>
                                    <p className={cn('text-3xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <Link href={resolveEventHref('/referee/scoring')} className="text-muted-foreground text-xs hover:underline">
                        ← Layouts
                    </Link>
                </div>

                <MatchTimerBanner showScores={false} />

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
                        <AlertTriangle className="h-10 w-10" />
                        <p>No foul/penalty score types configured</p>
                    </div>
                )}

                {match &&
                    selectedAllianceId &&
                    filteredGroups.map(([groupName, { alliance, team }]) => (
                        <div key={groupName} className="space-y-4">
                            {groupName !== 'ungrouped' && (
                                <div className="border-l-4 border-rose-500 pl-3">
                                    <h2 className="text-lg font-bold tracking-widest uppercase">{groupName}</h2>
                                </div>
                            )}

                            {alliance.length > 0 && (
                                <Card>
                                    <CardContent className="pt-5">
                                        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-widest uppercase">Alliance-wide</p>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {alliance.map((scoreType) => {
                                                const count = getAllianceScoreTypeCount(scoreType.id);
                                                return (
                                                    <Card key={scoreType.id} className="overflow-hidden border-rose-100 dark:border-rose-900">
                                                        <CardContent className="p-4">
                                                            <div className="mb-3 flex items-start justify-between">
                                                                <div>
                                                                    <p className="flex items-center gap-1.5 text-sm leading-tight font-medium">
                                                                        <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                        {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xl font-black text-rose-600">{scoreType.points} pts</p>
                                                                </div>
                                                                {count > 0 && (
                                                                    <Badge className="bg-rose-100 px-2 py-1 text-base text-rose-800 dark:bg-rose-900 dark:text-rose-200">
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
                                                                    className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
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
                                                        <Card key={scoreType.id} className="overflow-hidden border-rose-100 dark:border-rose-900">
                                                            <CardContent className="p-4">
                                                                <div className="mb-3 flex items-start justify-between">
                                                                    <div>
                                                                        <p className="flex items-center gap-1.5 text-sm leading-tight font-medium">
                                                                            <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                            {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                        </p>
                                                                        <p className="mt-0.5 text-xl font-black text-rose-600">
                                                                            {scoreType.points} pts
                                                                        </p>
                                                                    </div>
                                                                    {count > 0 && (
                                                                        <Badge className="bg-rose-100 px-2 py-1 text-base text-rose-800 dark:bg-rose-900 dark:text-rose-200">
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
                                                                        className="flex-1 bg-rose-600 text-white hover:bg-rose-700"
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
