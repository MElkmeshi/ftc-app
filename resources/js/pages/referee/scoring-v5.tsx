import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MatchTimerBanner } from '@/components/match-timer-banner';
import { useScoringPage } from '@/hooks/use-scoring-page';
import { getAllianceColorClasses } from '@/lib/match-utils';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { CheckCircle, Minus, Plus, Star, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Scoring Only', href: '/referee/scoring5' }];

export default function RefereeScoringOnly() {
    const {
        selectedAllianceId, setSelectedAllianceId,
        selectedMatchId, setSelectedMatchId,
        match, isLoading, ongoingMatches, alliances,
        colorClasses, sortedGroups, teamsInAlliance,
        getTotalAllianceScore, getAllianceScoreTypeCount, getTeamScoreTypeCount,
        handleAddScore, handleRemoveScore, handleEndMatch, isPending, isEndMatchPending,
    } = useScoringPage();

    // Only positive-point score types
    const filteredGroups = sortedGroups
        .map(([groupName, { alliance, team }]) => [
            groupName,
            {
                alliance: alliance.filter((st) => st.points > 0),
                team: team.filter((st) => st.points > 0),
            },
        ] as const)
        .filter(([, { alliance, team }]) => alliance.length > 0 || team.length > 0);

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
                                        'capitalize font-semibold',
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
                            <p className="text-xs text-muted-foreground">Alliance Total</p>
                            <p className={cn('text-4xl font-black tabular-nums', colorClasses.text)}>{getTotalAllianceScore()}</p>
                        </div>
                    )}

                    <Link href="/referee/scoring" className="text-xs text-muted-foreground hover:underline">
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
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Trophy className="h-10 w-10" />
                        <p>Select an ongoing match above</p>
                    </div>
                )}

                {match && match.match_alliances.length === 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Users className="h-10 w-10" />
                        <p>No teams assigned to Match #{match.number}</p>
                    </div>
                )}

                {match && !selectedAllianceId && match.match_alliances.length > 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <p>Select an alliance above</p>
                    </div>
                )}

                {match && selectedAllianceId && filteredGroups.length === 0 && (
                    <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Star className="h-10 w-10" />
                        <p>No positive-point score types configured</p>
                    </div>
                )}

                {match && selectedAllianceId && filteredGroups.map(([groupName, { alliance, team }]) => (
                    <div key={groupName} className="space-y-4">
                        {groupName !== 'ungrouped' && (
                            <div className="border-l-4 border-emerald-500 pl-3">
                                <h2 className="text-lg font-bold uppercase tracking-widest">{groupName}</h2>
                            </div>
                        )}

                        {alliance.length > 0 && (
                            <Card>
                                <CardContent className="pt-5">
                                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alliance-wide</p>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {alliance.map((scoreType) => {
                                            const count = getAllianceScoreTypeCount(scoreType.id);
                                            return (
                                                <Card key={scoreType.id} className="overflow-hidden border-emerald-100 dark:border-emerald-900">
                                                    <CardContent className="p-4">
                                                        <div className="mb-3 flex items-start justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium leading-tight">{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                                <p className="mt-0.5 text-xl font-black text-emerald-600">+{scoreType.points} pts</p>
                                                            </div>
                                                            {count > 0 && (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-1 text-base">
                                                                    {count}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleRemoveScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                                disabled={count === 0 || isPending}
                                                                size="lg" variant="outline" className="flex-1"
                                                            >
                                                                <Minus className="h-5 w-5" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleAddScore(scoreType.id, { allianceId: selectedAllianceId ?? undefined })}
                                                                disabled={isPending}
                                                                size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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

                        {team.length > 0 && teamsInAlliance.map((ma) => (
                            <Card key={ma.id}>
                                <CardContent className="pt-5">
                                    <div className="mb-3 flex items-center justify-between border-b pb-3">
                                        <h3 className="text-xl font-bold">{ma.team.name}</h3>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Team Score</p>
                                            <p className="text-2xl font-black">{ma.score}</p>
                                        </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                        {team.map((scoreType) => {
                                            const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                            return (
                                                <Card key={scoreType.id} className="overflow-hidden border-emerald-100 dark:border-emerald-900">
                                                    <CardContent className="p-4">
                                                        <div className="mb-3 flex items-start justify-between">
                                                            <div>
                                                                <p className="text-sm font-medium leading-tight">{scoreType.name.replace(/_/g, ' ').toUpperCase()}</p>
                                                                <p className="mt-0.5 text-xl font-black text-emerald-600">+{scoreType.points} pts</p>
                                                            </div>
                                                            {count > 0 && (
                                                                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-2 py-1 text-base">
                                                                    {count}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                onClick={() => handleRemoveScore(scoreType.id, { teamId: ma.team.id })}
                                                                disabled={count === 0 || isPending}
                                                                size="lg" variant="outline" className="flex-1"
                                                            >
                                                                <Minus className="h-5 w-5" />
                                                            </Button>
                                                            <Button
                                                                onClick={() => handleAddScore(scoreType.id, { teamId: ma.team.id })}
                                                                disabled={isPending}
                                                                size="lg" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
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

                {match && match.status === 'ongoing' && (
                    <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                        <CardContent className="flex items-center justify-between p-4">
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
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
