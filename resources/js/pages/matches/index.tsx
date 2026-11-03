import { MatchTimerBanner } from '@/components/match-timer-banner';
import { ScheduleTimingFields, type ScheduleTimingValue } from '@/components/schedule-timing-fields';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { useCancelMatch, useEndMatch, useLoadMatch, useMatches, useStartMatch } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { formatMatchTime } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, Eye, Pause, Play, Printer, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';

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

/** Reads the server's message out of a failed API call. */
function apiErrorMessage(error: unknown, fallback: string): string {
    const data = (error as { response?: { data?: unknown } }).response?.data;

    if (typeof data === 'string') {
        try {
            return (JSON.parse(data) as { message?: string }).message ?? fallback;
        } catch {
            return fallback;
        }
    }

    return fallback;
}

function useScheduleTiming(enabled: boolean) {
    const api = useApi();

    return useQuery({ queryKey: ['schedule-timing'], queryFn: api.getScheduleTiming, enabled });
}

function GenerateScheduleDialog() {
    const [open, setOpen] = useState(false);
    const [matchesPerTeam, setMatchesPerTeam] = useState('4');
    const [teamsPerAlliance, setTeamsPerAlliance] = useState('2');
    const [timing, setTiming] = useState<ScheduleTimingValue | null>(null);
    const [error, setError] = useState('');
    const api = useApi();
    const queryClient = useQueryClient();
    const { data: savedTiming } = useScheduleTiming(open);
    const timingValue = timing ?? savedTiming ?? null;

    const mutation = useMutation({
        mutationFn: (data: { matches_per_team: number; teams_per_alliance: number } & Partial<ScheduleTimingValue>) => api.generateSchedule(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            setOpen(false);
            // Reload the page to get fresh positions/alliance labels from the server
            window.location.reload();
        },
        onError: (err: unknown) => {
            setError(apiErrorMessage(err, 'Failed to generate schedule.'));
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        mutation.mutate({
            matches_per_team: parseInt(matchesPerTeam, 10),
            teams_per_alliance: parseInt(teamsPerAlliance, 10),
            ...(timingValue ?? {}),
        });
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                setError('');
                setTiming(null);
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Calendar className="mr-1 h-4 w-4" />
                    Generate Schedule
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Generate Match Schedule</DialogTitle>
                        <DialogDescription>This will delete all existing matches and generate a new schedule.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                        {timingValue && <ScheduleTimingFields value={timingValue} onChange={setTiming} />}
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

/** Re-plans start times (after a delay, or to add lunch) without touching the matches themselves. */
function RetimeScheduleDialog() {
    const [open, setOpen] = useState(false);
    const [timing, setTiming] = useState<ScheduleTimingValue | null>(null);
    const [error, setError] = useState('');
    const api = useApi();
    const queryClient = useQueryClient();
    const { data: savedTiming } = useScheduleTiming(open);
    const timingValue = timing ?? savedTiming ?? null;

    const mutation = useMutation({
        mutationFn: (data: ScheduleTimingValue) => api.updateScheduleTiming(data),
        onSuccess: (saved) => {
            queryClient.setQueryData(['schedule-timing'], saved);
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            setOpen(false);
        },
        onError: (err: unknown) => setError(apiErrorMessage(err, 'Could not update match times.')),
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                setError('');
                setTiming(null);
            }}
        >
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Clock className="mr-1 h-4 w-4" />
                    Match Times
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (timingValue) {
                            mutation.mutate(timingValue);
                        }
                    }}
                >
                    <DialogHeader>
                        <DialogTitle>Qualification match times</DialogTitle>
                        <DialogDescription>
                            Recalculates every qualification match's start time. Matches and scores are not changed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">{timingValue && <ScheduleTimingFields value={timingValue} onChange={setTiming} />}</div>
                    {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={mutation.isPending || !timingValue}>
                            {mutation.isPending ? 'Saving...' : 'Update times'}
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
                        Are you sure? This will permanently delete all matches, scores, and alliance assignments. This action cannot be undone.
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
    const eventTimezone = usePage<SharedData>().props.event?.timezone;
    const fieldCount = useFieldCount();
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
                    <div className="flex gap-2 print:hidden">
                        <Button size="sm" variant="outline" onClick={() => window.print()}>
                            <Printer className="mr-1 h-4 w-4" />
                            Print Schedule
                        </Button>
                        <GenerateScheduleDialog />
                        <RetimeScheduleDialog />
                        <DeleteAllMatchesDialog />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="mb-4">
                        <MatchTimerBanner forRefereeTablet={false} />
                    </div>
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
                                        <th className="px-4 py-2 text-left font-medium">Time</th>
                                        {fieldCount > 1 && <th className="px-4 py-2 text-left font-medium">Field</th>}
                                        <th className="px-4 py-2 text-left font-medium">Status</th>
                                        {positions.map((pos) => {
                                            const allianceColor = allianceLabels[pos.alliance_id] ?? 'Alliance';
                                            const label = `${allianceColor.charAt(0).toUpperCase() + allianceColor.slice(1)} ${pos.alliance_pos}`;
                                            return (
                                                <th key={`${pos.alliance_id}-${pos.alliance_pos}`} className="px-4 py-2 text-left font-medium">
                                                    {label}
                                                </th>
                                            );
                                        })}
                                        <th className="px-4 py-2 text-right font-medium print:hidden">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matches.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={positions.length + (fieldCount > 1 ? 5 : 4)}
                                                className="text-muted-foreground px-4 py-8 text-center"
                                            >
                                                No matches found
                                            </td>
                                        </tr>
                                    ) : (
                                        matches.map((match) => (
                                            <tr key={match.id} className="hover:bg-muted/50 border-b">
                                                <td className="px-4 py-2 font-medium">{match.number}</td>
                                                <td className="px-4 py-2 whitespace-nowrap tabular-nums">
                                                    {formatMatchTime(match.start_time, eventTimezone)}
                                                </td>
                                                {fieldCount > 1 && <td className="px-4 py-2 tabular-nums">{match.field}</td>}
                                                <td className="px-4 py-2">
                                                    <Badge className={cn('capitalize', statusColor(match.status))}>{match.status}</Badge>
                                                </td>
                                                {positions.map((pos) => (
                                                    <td key={`${match.id}-${pos.alliance_id}-${pos.alliance_pos}`} className="px-4 py-2">
                                                        {getTeamForPosition(match, pos)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 print:hidden">
                                                    <div className="flex justify-end gap-2">
                                                        {match.status === 'upcoming' && loadedMatchId !== match.id ? (
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
                                                        ) : null}
                                                        {match.status === 'upcoming' && loadedMatchId === match.id ? (
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
                                                        ) : null}
                                                        {match.status === 'ongoing' ? (
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
                                                        ) : null}
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
