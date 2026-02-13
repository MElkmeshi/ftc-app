import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    useAcceptPick,
    useAllianceGroups,
    useAllianceSelectionRankings,
    useAvailableTeams,
    useDeclinePick,
    useInviteTeam,
    useResetAllianceSelection,
    useStartAllianceSelection,
} from '@/hooks/use-alliance-selection';
import { useCheckSeriesWinner, useEliminationBracket, useGenerateElimination, useGenerateTiebreaker, useResetElimination } from '@/hooks/use-elimination';
import AppLayout from '@/layouts/app-layout';
import { type AllianceGroup, type BreadcrumbItem, type CompetitionMatch, type EliminationSeries } from '@/types';
import { Head } from '@inertiajs/react';
import { RotateCcw, Swords, Trophy, Users } from 'lucide-react';
import { useState } from 'react';

function getAllianceScore(match: CompetitionMatch, color: string): number {
    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + ma.score, 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.score_type?.points || 0), 0);

    return teamScore + allianceWideScore;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/alliance-selection' },
    { title: 'Alliance Selection', href: '/admin/alliance-selection' },
];

function InviteTeamDialog({ group }: { group: AllianceGroup }) {
    const [open, setOpen] = useState(false);
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const { data: availableTeams = [] } = useAvailableTeams();
    const inviteTeam = useInviteTeam();

    const handleInvite = () => {
        if (!selectedTeamId) return;
        inviteTeam.mutate(
            { allianceGroupId: group.id, teamId: parseInt(selectedTeamId) },
            {
                onSuccess: () => {
                    setOpen(false);
                    setSelectedTeamId('');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">Invite Team</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Team for Alliance #{group.seed}</DialogTitle>
                    <DialogDescription>
                        Captain: #{group.captain_team.number} {group.captain_team.name}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a team..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableTeams.map((team) => (
                                <SelectItem key={team.id} value={String(team.id)}>
                                    #{team.number} - {team.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={!selectedTeamId || inviteTeam.isPending}>
                        {inviteTeam.isPending ? 'Inviting...' : 'Send Invite'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function PendingActions({ group }: { group: AllianceGroup }) {
    const acceptPick = useAcceptPick();
    const declinePick = useDeclinePick();

    return (
        <div className="flex items-center gap-2">
            <Button size="sm" variant="default" onClick={() => acceptPick.mutate(group.id)} disabled={acceptPick.isPending}>
                {acceptPick.isPending ? 'Accepting...' : 'Accept'}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => declinePick.mutate(group.id)} disabled={declinePick.isPending}>
                {declinePick.isPending ? 'Declining...' : 'Decline'}
            </Button>
        </div>
    );
}

function getRoundLabel(round: string): string {
    const labels: Record<string, string> = {
        semifinal_1: 'Semifinal 1',
        semifinal_2: 'Semifinal 2',
        final: 'Final',
        tiebreaker_semifinal_1: 'Tiebreaker SF1',
        tiebreaker_semifinal_2: 'Tiebreaker SF2',
        tiebreaker_final: 'Tiebreaker Final',
    };
    return labels[round] ?? round;
}

function SeriesCard({ series }: { series: EliminationSeries }) {
    const checkWinner = useCheckSeriesWinner();
    const generateTiebreaker = useGenerateTiebreaker();

    const result = series.result;
    const isTied = result && result.group_1_wins === result.group_2_wins && result.completed_matches >= 2;
    const allMatchesComplete = result && result.completed_matches === result.total_matches;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{getRoundLabel(series.round)}</CardTitle>
                    <Badge variant={series.status === 'completed' ? 'default' : series.status === 'in_progress' ? 'secondary' : 'outline'}>
                        {series.status}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                            Alliance #{series.alliance_group1.seed}: #{series.alliance_group1.captain_team.number} &{' '}
                            #{series.alliance_group1.picked_team?.number}
                        </span>
                        <Badge variant="outline">{result?.group_1_wins ?? 0} wins</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                            Alliance #{series.alliance_group2.seed}: #{series.alliance_group2.captain_team.number} &{' '}
                            #{series.alliance_group2.picked_team?.number}
                        </span>
                        <Badge variant="outline">{result?.group_2_wins ?? 0} wins</Badge>
                    </div>

                    {/* Match results */}
                    <div className="border-t pt-2">
                        {series.matches.map((match) => {
                            const redScore = getAllianceScore(match, 'red');
                            const blueScore = getAllianceScore(match, 'blue');

                            return (
                                <div key={match.id} className="flex items-center justify-between py-1 text-sm">
                                    <span className="text-muted-foreground">
                                        Match #{match.number} {match.round?.startsWith('tiebreaker') ? '(TB)' : ''}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-red-600">{redScore}</span>
                                        <span className="text-muted-foreground">vs</span>
                                        <span className="font-medium text-blue-600">{blueScore}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {match.status}
                                        </Badge>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    {series.status !== 'completed' && allMatchesComplete && (
                        <div className="flex gap-2 border-t pt-2">
                            <Button
                                size="sm"
                                onClick={() => checkWinner.mutate(series.id)}
                                disabled={checkWinner.isPending}
                            >
                                {checkWinner.isPending ? 'Checking...' : 'Check Winner'}
                            </Button>
                            {isTied && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => generateTiebreaker.mutate(series.id)}
                                    disabled={generateTiebreaker.isPending}
                                >
                                    {generateTiebreaker.isPending ? 'Generating...' : 'Add Tiebreaker'}
                                </Button>
                            )}
                        </div>
                    )}

                    {series.winner && (
                        <div className="flex items-center gap-2 border-t pt-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">
                                Winner: Alliance #{series.winner.seed} (#{series.winner.captain_team.number} &{' '}
                                #{series.winner.picked_team?.number})
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default function AllianceSelectionPage() {
    const [numberOfAlliances, setNumberOfAlliances] = useState<string>('2');
    const { data: rankings = [], isLoading: rankingsLoading } = useAllianceSelectionRankings();
    const { data: groups = [], isLoading: groupsLoading } = useAllianceGroups(3000);
    const { data: bracket } = useEliminationBracket(3000);
    const startSelection = useStartAllianceSelection();
    const resetSelection = useResetAllianceSelection();
    const generateElimination = useGenerateElimination();
    const resetElimination = useResetElimination();

    const hasGroups = groups.length > 0;
    const allPicked = hasGroups && groups.every((g) => g.picked_team !== null);
    const hasBracket = bracket && bracket.series.length > 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Alliance Selection" />

            <div className="space-y-6">
                {/* Rankings */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5" />
                            Qualification Rankings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rankingsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
                            </div>
                        ) : rankings.length === 0 ? (
                            <p className="text-muted-foreground py-4 text-center">No completed qualification matches yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="px-4 py-2 text-left font-medium">Rank</th>
                                            <th className="px-4 py-2 text-left font-medium">Team</th>
                                            <th className="px-4 py-2 text-right font-medium">Total Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rankings.map((team, index) => (
                                            <tr key={team.team_id} className="hover:bg-muted/50 border-b">
                                                <td className="px-4 py-2 font-bold">{index + 1}</td>
                                                <td className="px-4 py-2">
                                                    #{team.team_number} - {team.team_name}
                                                </td>
                                                <td className="px-4 py-2 text-right font-semibold">{team.total_score}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Alliance Selection */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Alliance Selection
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {!hasGroups && rankings.length >= 2 && (
                                <div className="flex items-center gap-2">
                                    <Select value={numberOfAlliances} onValueChange={setNumberOfAlliances}>
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">2 Alliances</SelectItem>
                                            <SelectItem value="4">4 Alliances</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        onClick={() => startSelection.mutate(parseInt(numberOfAlliances))}
                                        disabled={startSelection.isPending}
                                    >
                                        {startSelection.isPending ? 'Starting...' : 'Start Selection'}
                                    </Button>
                                </div>
                            )}
                            {hasGroups && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => resetSelection.mutate()}
                                    disabled={resetSelection.isPending}
                                >
                                    <RotateCcw className="mr-1 h-4 w-4" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {groupsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
                            </div>
                        ) : !hasGroups ? (
                            <p className="text-muted-foreground py-4 text-center">
                                Start alliance selection to assign captains and pick teams.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {groups.map((group) => (
                                    <div
                                        key={group.id}
                                        className="flex items-center justify-between rounded-lg border p-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-bold text-slate-900">
                                                {group.seed}
                                            </div>
                                            <div>
                                                <div className="font-medium">
                                                    Captain: #{group.captain_team.number} - {group.captain_team.name}
                                                </div>
                                                {group.picked_team ? (
                                                    <div className="text-muted-foreground text-sm">
                                                        Pick: #{group.picked_team.number} - {group.picked_team.name}
                                                    </div>
                                                ) : group.pending_team ? (
                                                    <div className="text-sm text-amber-600">
                                                        Invited: #{group.pending_team.number} - {group.pending_team.name} — Awaiting response...
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-amber-600">Waiting for invite...</div>
                                                )}
                                            </div>
                                        </div>
                                        {group.picked_team && <Badge>Complete</Badge>}
                                        {!group.picked_team && group.pending_team && <PendingActions group={group} />}
                                        {!group.picked_team && !group.pending_team && <InviteTeamDialog group={group} />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Elimination Bracket */}
                {allPicked && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Swords className="h-5 w-5" />
                                Elimination Bracket
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                {!hasBracket && (
                                    <Button
                                        onClick={() => generateElimination.mutate()}
                                        disabled={generateElimination.isPending}
                                    >
                                        {generateElimination.isPending ? 'Generating...' : 'Generate Bracket'}
                                    </Button>
                                )}
                                {hasBracket && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => resetElimination.mutate()}
                                        disabled={resetElimination.isPending}
                                    >
                                        <RotateCcw className="mr-1 h-4 w-4" />
                                        Reset Bracket
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!hasBracket ? (
                                <p className="text-muted-foreground py-4 text-center">
                                    All teams picked. Generate the elimination bracket to start playoffs.
                                </p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {bracket.series.map((series) => (
                                        <SeriesCard key={series.id} series={series} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
