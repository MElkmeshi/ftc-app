import { ScoreTypeIcon } from '@/components/game-look';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { ScoreControlList } from '@/components/scoring/score-controls';
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
import { Minus, Plus, Trophy, Users } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring — Team Tabs', href: '/referee/scoring3' }];

function getAddStyle(points: number): string {
    if (points > 0) return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md';
    if (points < 0) return 'bg-rose-600 hover:bg-rose-700 text-white shadow-md';
    return 'bg-slate-600 hover:bg-slate-700 text-white shadow-md';
}

export default function RefereeScoring3() {
    const [activeTab, setActiveTab] = useState<'alliance' | number>('alliance');

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

    const allianceScoreTypes = sortedGroups.flatMap(([, { alliance }]) => alliance);
    const teamScoreTypes = sortedGroups.flatMap(([, { team }]) => team);
    const allianceControls = sortedGroups.flatMap(([, group]) => group.allianceControls);
    const teamControls = sortedGroups.flatMap(([, group]) => group.teamControls);
    const selectedClassName = cn(colorClasses.border, colorClasses.bg, 'text-white');

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Scoring — Team Tabs" />

            <div className="space-y-5">
                {/* Match + alliance selector row */}
                <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedMatchId?.toString() ?? ''} onValueChange={(v) => setSelectedMatchId(Number(v))}>
                        <SelectTrigger className="w-[200px]">
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
                                    onClick={() => {
                                        setSelectedAllianceId(alliance.id);
                                        setActiveTab('alliance');
                                    }}
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
                        <div className={cn('ml-auto rounded-xl px-4 py-2 text-center', colorClasses.bgLight)}>
                            <p className="text-muted-foreground text-xs">Total</p>
                            <p className={cn('text-3xl font-black', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href={resolveEventHref('/referee/scoring')} className="text-muted-foreground text-xs hover:underline">
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
                        <p>Select an alliance above to begin scoring</p>
                    </div>
                )}

                {match && selectedAllianceId && (
                    <div className="flex gap-4">
                        {/* Tab sidebar */}
                        <div className="flex w-36 shrink-0 flex-col gap-2">
                            {/* Alliance tab */}
                            <button
                                onClick={() => setActiveTab('alliance')}
                                className={cn(
                                    'rounded-lg border-2 p-3 text-left transition-all',
                                    activeTab === 'alliance'
                                        ? cn(colorClasses.border, colorClasses.bgLight)
                                        : 'border-border bg-card hover:bg-accent',
                                )}
                            >
                                <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Alliance</p>
                                <p className={cn('mt-1 text-2xl font-black tabular-nums', colorClasses.text)}>
                                    {(match?.scores ?? [])
                                        .filter((s) => s.alliance_id === selectedAllianceId && !s.team_id)
                                        .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0)}
                                </p>
                            </button>

                            {/* One tab per team */}
                            {teamsInAlliance.map((ma) => (
                                <button
                                    key={ma.id}
                                    onClick={() => setActiveTab(ma.team.id)}
                                    className={cn(
                                        'rounded-lg border-2 p-3 text-left transition-all',
                                        activeTab === ma.team.id
                                            ? cn(colorClasses.border, colorClasses.bgLight)
                                            : 'border-border bg-card hover:bg-accent',
                                    )}
                                >
                                    <p className="text-muted-foreground truncate text-xs font-semibold tracking-widest uppercase">{ma.team.name}</p>
                                    <p className={cn('mt-1 text-2xl font-black tabular-nums', colorClasses.text)}>{ma.score}</p>
                                </button>
                            ))}
                        </div>

                        {/* Content panel */}
                        <div className="flex-1 space-y-4">
                            {activeTab === 'alliance' && (
                                <>
                                    {selectedAllianceId && (
                                        <ScoreControlList
                                            controls={allianceControls}
                                            countFor={getAllianceScoreTypeCount}
                                            onAdd={(id) => handleAddScore(id, { allianceId: selectedAllianceId })}
                                            onRemove={(id) => handleRemoveScore(id, { allianceId: selectedAllianceId })}
                                            disabled={isPending}
                                            selectedClassName={selectedClassName}
                                        />
                                    )}
                                    {allianceScoreTypes.length === 0 && allianceControls.length === 0 ? (
                                        <div className="text-muted-foreground flex h-40 items-center justify-center">
                                            No alliance-wide score types
                                        </div>
                                    ) : (
                                        allianceScoreTypes.map((scoreType) => {
                                            const count = getAllianceScoreTypeCount(scoreType.id);
                                            return (
                                                <Card key={scoreType.id}>
                                                    <CardContent className="flex items-center justify-between gap-4 p-5">
                                                        <div className="flex-1">
                                                            <p className="flex items-center gap-1.5 font-semibold">
                                                                <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                            </p>
                                                            <p className="text-muted-foreground text-sm">
                                                                {scoreType.points > 0 ? '+' : ''}
                                                                {scoreType.points} pts each
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <Badge
                                                                variant="outline"
                                                                className={cn('px-4 py-2 text-2xl font-black tabular-nums', colorClasses.text)}
                                                            >
                                                                {count}
                                                            </Badge>
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
                                                                    className="h-14 w-14"
                                                                >
                                                                    <Minus className="h-6 w-6" />
                                                                </Button>
                                                                <Button
                                                                    onClick={() =>
                                                                        handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })
                                                                    }
                                                                    disabled={isPending}
                                                                    size="lg"
                                                                    className={cn(
                                                                        'h-14 w-14',
                                                                        getAddStyle(
                                                                            scoreType.referee === 'penalty' ? -scoreType.points : scoreType.points,
                                                                        ),
                                                                    )}
                                                                >
                                                                    <Plus className="h-6 w-6" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })
                                    )}
                                </>
                            )}

                            {activeTab !== 'alliance' &&
                                (() => {
                                    const ma = teamsInAlliance.find((m) => m.team.id === activeTab);
                                    if (!ma) return null;
                                    return teamScoreTypes.length === 0 && teamControls.length === 0 ? (
                                        <div className="text-muted-foreground flex h-40 items-center justify-center">No team score types</div>
                                    ) : (
                                        <>
                                            <ScoreControlList
                                                controls={teamControls}
                                                countFor={(id) => getTeamScoreTypeCount(id, ma.team.id)}
                                                onAdd={(id) => handleAddScore(id, { teamId: ma.team.id })}
                                                onRemove={(id) => handleRemoveScore(id, { teamId: ma.team.id })}
                                                disabled={isPending}
                                                selectedClassName={selectedClassName}
                                            />
                                            {teamScoreTypes.map((scoreType) => {
                                                const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                                return (
                                                    <Card key={scoreType.id}>
                                                        <CardContent className="flex items-center justify-between gap-4 p-5">
                                                            <div className="flex-1">
                                                                <p className="flex items-center gap-1.5 font-semibold">
                                                                    <ScoreTypeIcon scoreType={scoreType} className="size-6" />
                                                                    {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                </p>
                                                                <p className="text-muted-foreground text-sm">
                                                                    {scoreType.points > 0 ? '+' : ''}
                                                                    {scoreType.points} pts each
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                <Badge
                                                                    variant="outline"
                                                                    className={cn('px-4 py-2 text-2xl font-black tabular-nums', colorClasses.text)}
                                                                >
                                                                    {count}
                                                                </Badge>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        onClick={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={count === 0 || isPending}
                                                                        size="lg"
                                                                        variant="outline"
                                                                        className="h-14 w-14"
                                                                    >
                                                                        <Minus className="h-6 w-6" />
                                                                    </Button>
                                                                    <Button
                                                                        onClick={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                                        disabled={isPending}
                                                                        size="lg"
                                                                        className={cn(
                                                                            'h-14 w-14',
                                                                            getAddStyle(
                                                                                scoreType.referee === 'penalty'
                                                                                    ? -scoreType.points
                                                                                    : scoreType.points,
                                                                            ),
                                                                        )}
                                                                    >
                                                                        <Plus className="h-6 w-6" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                        </div>
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
