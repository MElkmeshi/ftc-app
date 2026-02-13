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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCancelMatch, useEndMatch, useLoadMatch, useMatches, useStartMatch } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Eye, Pause, Play, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '@/hooks/use-api';

interface Position {
    alliance_id: number;
    alliance_pos: number;
}

interface MatchesPageProps {
    positions: Position[];
    allianceLabels: Record<number, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Matches',
        href: '/competition-matches',
    },
];

function statusColor(status: string): string {
    switch (status) {
        case 'ongoing':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'completed':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'cancelled':
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
}

function GenerateScheduleDialog() {
    const [open, setOpen] = useState(false);
    const [matchesPerTeam, setMatchesPerTeam] = useState('3');
    const [teamsPerAlliance, setTeamsPerAlliance] = useState('1');
    const [error, setError] = useState('');
    const api = useApi();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: (data: { matches_per_team: number; teams_per_alliance: number }) => api.generateSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            setOpen(false);
            // Reload the page to get fresh positions/alliance labels from the server
            window.location.reload();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onError: (err: any) => {
            setError(err.response?.data?.message ?? 'Failed to generate schedule.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        mutation.mutate({
            matches_per_team: parseInt(matchesPerTeam, 10),
            teams_per_alliance: parseInt(teamsPerAlliance, 10),
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); setError(''); }}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Calendar className="mr-1 h-4 w-4" />
                    Generate Schedule
                </Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Generate Match Schedule</DialogTitle>
                        <DialogDescription>
                            This will delete all existing matches and generate a new schedule.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="mpt">Matches Per Team</Label>
                            <Input
                                id="mpt"
                                type="number"
                                min="1"
                                value={matchesPerTeam}
                                onChange={(e) => setMatchesPerTeam(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="tpa">Teams Per Alliance</Label>
                            <Input
                                id="tpa"
                                type="number"
                                min="1"
                                value={teamsPerAlliance}
                                onChange={(e) => setTeamsPerAlliance(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={mutation.isPending}>
                            {mutation.isPending ? 'Generating...' : 'Generate'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteAllMatchesDialog() {
    const [open, setOpen] = useState(false);
    const api = useApi();
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => api.deleteAllMatches(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            setOpen(false);
        },
    });

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950">
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete All
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete All Matches</DialogTitle>
                    <DialogDescription>
                        Are you sure? This will permanently delete all matches, scores, and alliance assignments. This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                        {mutation.isPending ? 'Deleting...' : 'Delete All'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function MatchesIndex({ positions, allianceLabels }: MatchesPageProps) {
    const { data: matches = [], isLoading } = useMatches();
    const loadMatch = useLoadMatch();
    const startMatch = useStartMatch();
    const endMatch = useEndMatch();
    const cancelMatch = useCancelMatch();

    const [loadedMatchId, setLoadedMatchId] = useState<number | null>(null);
    const hasOngoing = matches.some((m) => m.status === 'ongoing');

    const getTeamForPosition = (match: (typeof matches)[0], position: Position) => {
        const allianceMembers = match.match_alliances.filter((a) => a.alliance.id === position.alliance_id);
        const member = allianceMembers[position.alliance_pos - 1];
        return member?.team?.name ?? '-';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Matches" />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Competition Matches</CardTitle>
                    <div className="flex gap-2">
                        <GenerateScheduleDialog />
                        <DeleteAllMatchesDialog />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="px-4 py-2 text-left font-medium">Match #</th>
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                        {positions.map((pos) => {
                                            const allianceColor = allianceLabels[pos.alliance_id] ?? 'Alliance';
                                            const label = `${allianceColor.charAt(0).toUpperCase() + allianceColor.slice(1)} ${pos.alliance_pos}`;
                                            return (
                                                <th
                                                    key={`${pos.alliance_id}-${pos.alliance_pos}`}
                                                    className="px-4 py-2 text-left font-medium"
                                                >
                                                    {label}
                                                </th>
                                            );
                                        })}
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matches.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={positions.length + 3}
                                                className="text-muted-foreground px-4 py-8 text-center"
                                            >
                                                No matches found
                                            </td>
                                        </tr>
                                    ) : (
                                        matches.map((match) => (
                                            <tr key={match.id} className="hover:bg-muted/50 border-b">
                                                <td className="px-4 py-2 font-medium">{match.number}</td>
                                                <td className="px-4 py-2">
                                                    <Badge className={cn('capitalize', statusColor(match.status))}>
                                                        {match.status}
                                                    </Badge>
                                                </td>
                                                {positions.map((pos) => (
                                                    <td
                                                        key={`${match.id}-${pos.alliance_id}-${pos.alliance_pos}`}
                                                        className="px-4 py-2"
                                                    >
                                                        {getTeamForPosition(match, pos)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2">
                                                    <div className="flex justify-end gap-2">
                                                        {match.status === 'upcoming' && loadedMatchId !== match.id && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={loadMatch.isPending}
                                                                onClick={() => {
                                                                    setLoadedMatchId(match.id);
                                                                    loadMatch.mutate(match.id);
                                                                }}
                                                            >
                                                                <Eye className="mr-1 h-4 w-4" />
                                                                Load
                                                            </Button>
                                                        )}
                                                        {match.status === 'upcoming' && loadedMatchId === match.id && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
                                                                disabled={hasOngoing || startMatch.isPending}
                                                                onClick={() => {
                                                                    startMatch.mutate(match.id);
                                                                    setLoadedMatchId(null);
                                                                }}
                                                            >
                                                                <Play className="mr-1 h-4 w-4" />
                                                                Start
                                                            </Button>
                                                        )}
                                                        {match.status === 'ongoing' && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950"
                                                                    disabled={endMatch.isPending}
                                                                    onClick={() => endMatch.mutate(match.id)}
                                                                >
                                                                    <Pause className="mr-1 h-4 w-4" />
                                                                    End
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                                                    disabled={cancelMatch.isPending}
                                                                    onClick={() => cancelMatch.mutate(match.id)}
                                                                >
                                                                    <XCircle className="mr-1 h-4 w-4" />
                                                                    Cancel
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppLayout>
    );
}
