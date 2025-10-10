import AppLayout from '@/layouts/app-layout';
import { useActiveMatch, useAddScore, useScoreTypes } from '@/hooks/use-match';
import { type BreadcrumbItem, type Alliance, type MatchAlliance, type ScoreType } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Referee Scoring',
        href: '/referee/scoring',
    },
];

export default function RefereeScoring() {
    const [selectedAllianceId, setSelectedAllianceId] = useState<number | null>(null);

    const addScore = useAddScore();

    // Fetch active match with 3-second polling
    const { data: match, isLoading } = useActiveMatch(3000);
    const { data: scoreTypes = [] } = useScoreTypes();

    // Listen for real-time score updates from other users
    useEcho(match?.id ? `matches.${match.id}` : '', 'ScoreUpdated', () => {
        // Refetch when other referees update scores
        // This won't interfere with our own optimistic updates
    });

    const selectedAlliance = match?.match_alliances.find((ma) => ma.alliance.id === selectedAllianceId);
    const teamsInAlliance = match?.match_alliances.filter((ma) => ma.alliance.id === selectedAllianceId) || [];

    // Group score types by target
    const allianceScoreTypes = scoreTypes.filter((st) => st.target === 'alliance');
    const teamScoreTypes = scoreTypes.filter((st) => st.target === 'team');

    const handleAddScore = (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
        if (!match) return;

        // Send either team_id or alliance_id, but not both
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
        // Sum team scores
        const teamScoresTotal = teamsInAlliance.reduce((sum, ma) => sum + ma.score, 0);

        // Add alliance-wide scores (where team_id is null)
        const allianceScoresTotal = (match?.scores || [])
            .filter(score => score.alliance_id === selectedAllianceId && !score.team_id)
            .reduce((sum, score) => sum + (score.score_type?.points || 0), 0);

        return teamScoresTotal + allianceScoresTotal;
    };

    const getScoreTypeButtonClass = (points: number) => {
        if (points > 0) return 'bg-green-600 hover:bg-green-700 text-white';
        if (points < 0) return 'bg-red-600 hover:bg-red-700 text-white';
        return 'bg-gray-600 hover:bg-gray-700 text-white';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Referee Scoring" />

            <div className="space-y-6">
                {/* Match Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Active Match</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading && <p className="text-muted-foreground">Loading active match...</p>}
                        {!isLoading && !match && <p className="text-muted-foreground">No active match found</p>}
                        {match && (
                            <div>
                                <div className="text-2xl font-bold">Match #{match.number}</div>
                                <Badge className="mt-2">{match.status}</Badge>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Alliance Selection */}
                {match && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Alliance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4">
                                {Array.from(new Set(match.match_alliances.map((ma) => ma.alliance.id))).map((allianceId) => {
                                    const alliance = match.match_alliances.find((ma) => ma.alliance.id === allianceId)?.alliance;
                                    if (!alliance) return null;
                                    return (
                                        <Button
                                            key={allianceId}
                                            onClick={() => setSelectedAllianceId(allianceId)}
                                            variant={selectedAllianceId === allianceId ? 'default' : 'outline'}
                                            className={
                                                selectedAllianceId === allianceId && alliance.color === 'red'
                                                    ? 'bg-red-600 hover:bg-red-700'
                                                    : selectedAllianceId === allianceId && alliance.color === 'blue'
                                                      ? 'bg-blue-600 hover:bg-blue-700'
                                                      : ''
                                            }
                                        >
                                            {alliance.color.charAt(0).toUpperCase() + alliance.color.slice(1)} Alliance
                                        </Button>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Scoring Interface */}
                {match && selectedAllianceId && (
                    <div className="space-y-6">
                        {/* Alliance Total Score */}
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {selectedAlliance?.alliance.color.charAt(0).toUpperCase() +
                                        selectedAlliance?.alliance.color.slice(1)}{' '}
                                    Alliance Total Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-4xl font-bold">{getTotalAllianceScore()}</div>
                            </CardContent>
                        </Card>

                        {/* Alliance-wide Scoring */}
                        {allianceScoreTypes.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Alliance-Wide Actions</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                        {allianceScoreTypes.map((scoreType) => (
                                            <Button
                                                key={scoreType.id}
                                                onClick={() =>
                                                    handleAddScore(scoreType.id, {
                                                        allianceId: selectedAllianceId ?? undefined,
                                                    })
                                                }
                                                className={getScoreTypeButtonClass(scoreType.points)}
                                                disabled={addScore.isPending}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm">{scoreType.name.replace(/_/g, ' ').toUpperCase()}</span>
                                                    <span className="text-lg font-bold">
                                                        {scoreType.points > 0 ? '+' : ''}
                                                        {scoreType.points}
                                                    </span>
                                                </div>
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Team-Specific Scoring */}
                        {teamScoreTypes.length > 0 && (
                            <div className="space-y-4">
                                {teamsInAlliance.map((ma) => (
                                    <Card key={ma.id}>
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle>{ma.team.name}</CardTitle>
                                                <div className="text-2xl font-bold">{ma.score}</div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                                                {teamScoreTypes.map((scoreType) => (
                                                    <Button
                                                        key={scoreType.id}
                                                        onClick={() =>
                                                            handleAddScore(scoreType.id, {
                                                                teamId: ma.team.id,
                                                            })
                                                        }
                                                        className={getScoreTypeButtonClass(scoreType.points)}
                                                        disabled={addScore.isPending}
                                                    >
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-sm">
                                                                {scoreType.name.replace(/_/g, ' ').toUpperCase()}
                                                            </span>
                                                            <span className="text-lg font-bold">
                                                                {scoreType.points > 0 ? '+' : ''}
                                                                {scoreType.points}
                                                            </span>
                                                        </div>
                                                    </Button>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
