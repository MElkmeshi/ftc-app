import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveMatch, useAddScore, useDeleteScore, useEndMatch, useMatch, useMatches, useScoreTypes } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { CheckCircle, Minus, Plus, Trophy, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Referee Scoring',
        href: '/referee/scoring',
    },
];

export default function RefereeScoring() {
    const [selectedAllianceId, setSelectedAllianceId] = useState<number | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const addScore = useAddScore();
    const deleteScore = useDeleteScore();
    const endMatch = useEndMatch();

    const { data: matches = [] } = useMatches();
    const { data: activeMatch } = useActiveMatch();
    const { data: match, isLoading } = useMatch(selectedMatchId, 3000);
    const { data: scoreTypes = [] } = useScoreTypes();

    const ongoingMatches = matches.filter((m) => m.status === 'ongoing');

    useEffect(() => {
        if (activeMatch && !selectedMatchId) {
            setSelectedMatchId(activeMatch.id);
        }
    }, [activeMatch, selectedMatchId]);

    // Auto-select alliance when match loads and only one ongoing match
    useEffect(() => {
        if (match && !selectedAllianceId && ongoingMatches.length === 1) {
            const firstAlliance = match.match_alliances[0]?.alliance;
            if (firstAlliance) {
                setSelectedAllianceId(firstAlliance.id);
            }
        }
    }, [match, selectedAllianceId, ongoingMatches.length]);

    useEcho(match?.id ? `matches.${match.id}` : '', 'ScoreUpdated', () => {
        // Refetch when other referees update scores
    });

    const selectedAlliance = match?.match_alliances.find((ma) => ma.alliance.id === selectedAllianceId);
    const teamsInAlliance = match?.match_alliances.filter((ma) => ma.alliance.id === selectedAllianceId) || [];

    const allianceScoreTypes = scoreTypes.filter((st) => st.target === 'alliance');
    const teamScoreTypes = scoreTypes.filter((st) => st.target === 'team');

    // Group score types by group, organizing by alliance/team within each group
    const groupScoreTypesByGroup = (types: typeof scoreTypes) => {
        const grouped: Record<string, { alliance: typeof scoreTypes; team: typeof scoreTypes }> = {
            ungrouped: { alliance: [], team: [] },
        };

        types.forEach((st) => {
            const groupName = st.group?.name || 'ungrouped';
            if (!grouped[groupName]) {
                grouped[groupName] = { alliance: [], team: [] };
            }

            if (st.target === 'alliance') {
                grouped[groupName].alliance.push(st);
            } else {
                grouped[groupName].team.push(st);
            }
        });

        return grouped;
    };

    const groupedScoreTypes = groupScoreTypesByGroup(scoreTypes);

    // Sort groups by display_order, ungrouped always last
    const sortedGroups = Object.entries(groupedScoreTypes).sort(([keyA, valA], [keyB, valB]) => {
        if (keyA === 'ungrouped') return 1;
        if (keyB === 'ungrouped') return -1;

        const groupA = scoreTypes.find((st) => st.group?.name === keyA)?.group;
        const groupB = scoreTypes.find((st) => st.group?.name === keyB)?.group;

        return (groupA?.display_order || 0) - (groupB?.display_order || 0);
    });

    const allianceColor = selectedAlliance?.alliance.color || 'gray';

    const handleAddScore = (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
        if (!match) return;

        if (options.allianceId) {
            addScore.mutate({
                match_id: match.id,
                alliance_id: options.allianceId,
                score_type_id: scoreTypeId,
            });
        } else if (options.teamId) {
            addScore.mutate({
                match_id: match.id,
                team_id: options.teamId,
                score_type_id: scoreTypeId,
            });
        }
    };

    const getTotalAllianceScore = () => {
        const teamScoresTotal = teamsInAlliance.reduce((sum, ma) => sum + ma.score, 0);
        const allianceScoresTotal = (match?.scores || [])
            .filter((score) => score.alliance_id === selectedAllianceId && !score.team_id)
            .reduce((sum, score) => sum + (score.score_type?.points || 0), 0);
        return teamScoresTotal + allianceScoresTotal;
    };

    const getAllianceScoreTypeCount = (scoreTypeId: number) => {
        if (!match || !selectedAllianceId) return 0;
        return (match.scores || []).filter(
            (score) => score.score_type_id === scoreTypeId && score.alliance_id === selectedAllianceId && !score.team_id,
        ).length;
    };

    const getTeamScoreTypeCount = (scoreTypeId: number, teamId: number) => {
        if (!match) return 0;
        return (match.scores || []).filter((score) => score.score_type_id === scoreTypeId && score.team_id === teamId).length;
    };

    const getLatestAllianceScoreId = (scoreTypeId: number) => {
        if (!match || !selectedAllianceId) return null;
        const scores = (match.scores || [])
            .filter((score) => score.score_type_id === scoreTypeId && score.alliance_id === selectedAllianceId && !score.team_id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return scores.length > 0 ? scores[0].id : null;
    };

    const getLatestTeamScoreId = (scoreTypeId: number, teamId: number) => {
        if (!match) return null;
        const scores = (match.scores || [])
            .filter((score) => score.score_type_id === scoreTypeId && score.team_id === teamId)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return scores.length > 0 ? scores[0].id : null;
    };

    const handleRemoveScore = (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
        if (!match) return;

        const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
        if (!scoreType) return;

        let scoreId: number | null = null;
        if (options.allianceId) {
            scoreId = getLatestAllianceScoreId(scoreTypeId);
        } else if (options.teamId) {
            scoreId = getLatestTeamScoreId(scoreTypeId, options.teamId);
        }

        if (scoreId) {
            deleteScore.mutate({
                scoreId,
                matchId: match.id,
                teamId: options.teamId,
                points: scoreType.points,
            });
        }
    };

    const getScoreButtonStyles = (points: number) => {
        if (points > 0) {
            return 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-lg';
        }
        if (points < 0) {
            return 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-lg';
        }
        return 'bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white shadow-lg';
    };

    const getAllianceColorClasses = (color: string) => {
        if (color === 'red') {
            return {
                bg: 'bg-red-600',
                bgHover: 'hover:bg-red-700',
                border: 'border-red-500',
                text: 'text-red-600',
                bgLight: 'bg-red-50 dark:bg-red-950',
            };
        }
        if (color === 'blue') {
            return {
                bg: 'bg-blue-600',
                bgHover: 'hover:bg-blue-700',
                border: 'border-blue-500',
                text: 'text-blue-600',
                bgLight: 'bg-blue-50 dark:bg-blue-950',
            };
        }
        return {
            bg: 'bg-gray-600',
            bgHover: 'hover:bg-gray-700',
            border: 'border-gray-500',
            text: 'text-gray-600',
            bgLight: 'bg-gray-50 dark:bg-gray-950',
        };
    };

    const alliances = match
        ? Array.from(new Set(match.match_alliances.map((ma) => ma.alliance.id))).map((allianceId) => {
              return match.match_alliances.find((ma) => ma.alliance.id === allianceId)?.alliance;
          })
        : [];

    const colorClasses = getAllianceColorClasses(allianceColor);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Referee Scoring" />

            <div className="space-y-6">
                {/* Match Selector */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <label className="text-lg font-semibold">Select Match:</label>
                            <Select value={selectedMatchId?.toString() || ''} onValueChange={(value) => setSelectedMatchId(Number(value))}>
                                <SelectTrigger className="w-[300px]">
                                    <SelectValue placeholder="Choose a match" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ongoingMatches.map((m) => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            Match #{m.number}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {isLoading && (
                    <div className="flex min-h-[40vh] items-center justify-center">
                        <div className="text-center">
                            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                            <p className="text-muted-foreground text-lg">Loading match...</p>
                        </div>
                    </div>
                )}

                {!isLoading && !match && (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Trophy className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                            <h2 className="mb-2 text-2xl font-bold">No Match Selected</h2>
                            <p className="text-muted-foreground">Please select an ongoing match from the dropdown above</p>
                        </CardContent>
                    </Card>
                )}

                {/* Header with Match Info and Alliance Selection */}
                {match && match.match_alliances.length === 0 && (
                    <Card>
                        <CardContent className="pt-12 pb-12 text-center">
                            <Users className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                            <h2 className="mb-2 text-2xl font-bold">No Teams Assigned</h2>
                            <p className="text-muted-foreground">
                                Match #{match.number} doesn't have any teams assigned yet. Please assign teams to this match before scoring.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {match && match.match_alliances.length > 0 && (
                    <>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn('flex h-16 w-16 items-center justify-center rounded-xl', colorClasses.bg)}>
                                    <Trophy className="h-8 w-8 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold">Match #{match.number}</h1>
                                    <Badge variant="secondary" className="mt-1">
                                        {match.status}
                                    </Badge>
                                </div>
                            </div>

                            {/* Alliance Selection */}
                            <div className="flex gap-3">
                                {alliances.map((alliance) => {
                                    if (!alliance) {
                                        return null;
                                    }
                                    const isSelected = selectedAllianceId === alliance.id;
                                    const colorClasses = getAllianceColorClasses(alliance.color);
                                    return (
                                        <Button
                                            key={alliance.id}
                                            onClick={() => setSelectedAllianceId(alliance.id)}
                                            size="lg"
                                            className={cn(
                                                'min-w-[140px] text-lg font-semibold transition-all',
                                                isSelected
                                                    ? cn(colorClasses.bg, colorClasses.bgHover, 'shadow-lg')
                                                    : 'bg-secondary hover:bg-secondary/80',
                                            )}
                                        >
                                            {alliance.color.charAt(0).toUpperCase() + alliance.color.slice(1)}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* Scoring Interface */}
                {match && selectedAllianceId ? (
                    <div className="space-y-6">
                        {/* Total Score Display */}
                        <Card className={cn('border-2', colorClasses.border, colorClasses.bgLight)}>
                            <CardContent className="pt-8 pb-8 text-center">
                                <p className={cn('mb-2 text-lg font-medium', colorClasses.text)}>Total Score</p>
                                <p className="text-7xl font-bold tracking-tight">{getTotalAllianceScore()}</p>
                            </CardContent>
                        </Card>

                        {/* Score Types Organized by Groups */}
                        {sortedGroups.map(([groupName, { alliance, team }]) => {
                            if (alliance.length === 0 && team.length === 0) {
                                return null;
                            }

                            return (
                                <div key={groupName} className="space-y-4">
                                    {/* Group Header */}
                                    {groupName !== 'ungrouped' && (
                                        <div className="pt-2">
                                            <h2 className="text-2xl font-bold uppercase tracking-wide">{groupName}</h2>
                                        </div>
                                    )}

                                    {/* Alliance-Wide Actions for this Group */}
                                    {alliance.length > 0 && (
                                        <Card>
                                            <CardContent className="pt-6">
                                                <div className="mb-4 flex items-center gap-2">
                                                    <Users className="text-muted-foreground h-5 w-5" />
                                                    <h3 className="text-lg font-semibold">Alliance Actions</h3>
                                                </div>
                                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                    {alliance.map((scoreType) => {
                                                        const count = getAllianceScoreTypeCount(scoreType.id);
                                                        return (
                                                            <Card key={scoreType.id} className="overflow-hidden">
                                                                <CardContent className="p-4">
                                                                    <div className="mb-3 flex items-center justify-between">
                                                                        <div>
                                                                            <p className="text-sm leading-none font-medium">
                                                                                {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                            </p>
                                                                            <p className="mt-1 text-2xl font-bold">
                                                                                {scoreType.points > 0 ? '+' : ''}
                                                                                {scoreType.points} pts
                                                                            </p>
                                                                        </div>
                                                                        {count > 0 && (
                                                                            <Badge variant="secondary" className="px-3 py-1 text-lg">
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
                                                                            disabled={count === 0 || addScore.isPending || deleteScore.isPending}
                                                                            size="lg"
                                                                            variant="outline"
                                                                            className="flex-1"
                                                                        >
                                                                            <Minus className="h-5 w-5" />
                                                                        </Button>
                                                                        <Button
                                                                            onClick={() =>
                                                                                handleAddScore(scoreType.id, {
                                                                                    allianceId: selectedAllianceId ?? undefined,
                                                                                })
                                                                            }
                                                                            disabled={addScore.isPending || deleteScore.isPending}
                                                                            size="lg"
                                                                            className={cn('flex-1', getScoreButtonStyles(scoreType.points))}
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

                                    {/* Team-Specific Actions for this Group */}
                                    {team.length > 0 && (
                                        <div className="space-y-4">
                                            {teamsInAlliance.map((ma) => (
                                                <Card key={ma.id}>
                                                    <CardContent className="pt-6">
                                                        <div className="mb-4 flex items-center justify-between border-b pb-4">
                                                            <h3 className="text-2xl font-bold">{ma.team.name}</h3>
                                                            <div className="text-right">
                                                                <p className="text-muted-foreground text-sm">Team Score</p>
                                                                <p className="text-3xl font-bold">{ma.score}</p>
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                            {team.map((scoreType) => {
                                                                const count = getTeamScoreTypeCount(scoreType.id, ma.team.id);
                                                                return (
                                                                    <Card key={scoreType.id} className="overflow-hidden">
                                                                        <CardContent className="p-4">
                                                                            <div className="mb-3 flex items-center justify-between">
                                                                                <div>
                                                                                    <p className="text-sm leading-none font-medium">
                                                                                        {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                                                    </p>
                                                                                    <p className="mt-1 text-2xl font-bold">
                                                                                        {scoreType.points > 0 ? '+' : ''}
                                                                                        {scoreType.points} pts
                                                                                    </p>
                                                                                </div>
                                                                                {count > 0 && (
                                                                                    <Badge variant="secondary" className="px-3 py-1 text-lg">
                                                                                        {count}
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <Button
                                                                                    onClick={() =>
                                                                                        handleRemoveScore(scoreType.id, {
                                                                                            teamId: ma.team.id,
                                                                                        })
                                                                                    }
                                                                                    disabled={count === 0 || addScore.isPending || deleteScore.isPending}
                                                                                    size="lg"
                                                                                    variant="outline"
                                                                                    className="flex-1"
                                                                                >
                                                                                    <Minus className="h-5 w-5" />
                                                                                </Button>
                                                                                <Button
                                                                                    onClick={() =>
                                                                                        handleAddScore(scoreType.id, {
                                                                                            teamId: ma.team.id,
                                                                                        })
                                                                                    }
                                                                                    disabled={addScore.isPending || deleteScore.isPending}
                                                                                    size="lg"
                                                                                    className={cn('flex-1', getScoreButtonStyles(scoreType.points))}
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
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : match && !selectedAllianceId ? (
                    <Card className="border-dashed">
                        <CardContent className="pt-12 pb-12 text-center">
                            <Users className="text-muted-foreground mx-auto mb-4 h-16 w-16" />
                            <h2 className="mb-2 text-2xl font-bold">Select an Alliance</h2>
                            <p className="text-muted-foreground">Choose an alliance above to begin scoring</p>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Submit Match Button — always visible when a match is selected */}
                {match && match.status === 'ongoing' && (
                    <Card className="border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
                        <CardContent className="flex items-center justify-between pt-6 pb-6">
                            <div>
                                <h3 className="text-xl font-bold">Submit Match</h3>
                                <p className="text-muted-foreground text-sm">Finalize scoring and end Match #{match.number}</p>
                            </div>
                            <Button
                                onClick={() => {
                                    if (match) {
                                        endMatch.mutate(match.id, {
                                            onSuccess: () => {
                                                setSelectedMatchId(null);
                                                setSelectedAllianceId(null);
                                            },
                                        });
                                    }
                                }}
                                disabled={endMatch.isPending}
                                size="lg"
                                className="bg-amber-600 text-white shadow-lg hover:bg-amber-500"
                            >
                                <CheckCircle className="mr-2 h-5 w-5" />
                                {endMatch.isPending ? 'Submitting...' : 'Submit Match'}
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
