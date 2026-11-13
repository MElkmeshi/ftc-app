import { ScheduleTimingFields, type ScheduleTimingValue } from '@/components/schedule-timing-fields';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { useMatches } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { formatMatchTime, getMatchTitle } from '@/lib/match-utils';
import { type BreadcrumbItem, type CompetitionMatch, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
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
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Matches', href: '/competition-matches' },
];

const SCHEDULE_SECTIONS: { type: CompetitionMatch['type']; title: string }[] = [
    { type: 'practice', title: 'Practice Schedule' },
    { type: 'qualification', title: 'Qualification Schedule' },
    { type: 'elimination', title: 'Playoff Schedule' },
];

const modalContent = 'top-7 translate-y-0 gap-0 rounded-lg border-black/20 bg-white p-0 text-base text-[#212529] sm:max-w-[500px]';
const modalHeader = 'border-b border-[#dee2e6] p-4';
const modalTitle = 'text-xl leading-normal font-medium';
const modalFooter = 'flex justify-end gap-2 border-t border-[#dee2e6] p-3';

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
                <button type="button" className={bs.btnSecondary}>
                    Run Matchmaker
                </button>
            </DialogTrigger>
            <DialogContent className={modalContent}>
                <form onSubmit={handleSubmit}>
                    <div className={modalHeader}>
                        <DialogTitle className={modalTitle}>Qualification Match Schedule</DialogTitle>
                        <DialogDescription className="mt-2 text-base text-[#212529]">
                            Replaces the qualification and playoff matches with a new schedule. Practice matches are kept.
                        </DialogDescription>
                    </div>
                    <div className="grid gap-4 p-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="mpt" className={bs.formLabel}>
                                    Matches Per Team
                                </label>
                                <input
                                    className={bs.formControl}
                                    id="mpt"
                                    type="number"
                                    min="1"
                                    value={matchesPerTeam}
                                    onChange={(e) => setMatchesPerTeam(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="tpa" className={bs.formLabel}>
                                    Teams Per Alliance
                                </label>
                                <input
                                    className={bs.formControl}
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
                        {error && <p className={bs.textDanger}>{error}</p>}
                    </div>
                    <div className={modalFooter}>
                        <button type="submit" className={bs.btnPrimary} disabled={mutation.isPending}>
                            Run Matchmaker
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

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
                <button type="button" className={`${bs.btnSecondary} ml-2`}>
                    Match Times
                </button>
            </DialogTrigger>
            <DialogContent className={modalContent}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (timingValue) {
                            mutation.mutate(timingValue);
                        }
                    }}
                >
                    <div className={modalHeader}>
                        <DialogTitle className={modalTitle}>Match Times</DialogTitle>
                        <DialogDescription className="mt-2 text-base text-[#212529]">
                            Recalculates every qualification match's start time. Matches and scores are not changed.
                        </DialogDescription>
                    </div>
                    <div className="p-4">{timingValue && <ScheduleTimingFields value={timingValue} onChange={setTiming} />}</div>
                    {error && <p className={`px-4 pb-4 ${bs.textDanger}`}>{error}</p>}
                    <div className={modalFooter}>
                        <button type="submit" className={bs.btnPrimary} disabled={mutation.isPending || !timingValue}>
                            Save
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function PracticeScheduleDialog({ hasPractice }: { hasPractice: boolean }) {
    const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).has('practice'));
    const [matchesPerTeam, setMatchesPerTeam] = useState('1');
    const [teamsPerAlliance, setTeamsPerAlliance] = useState('2');
    const [firstMatchAt, setFirstMatchAt] = useState<string | null>(null);
    const [cycleMinutes, setCycleMinutes] = useState('6');
    const [error, setError] = useState('');
    const api = useApi();
    const queryClient = useQueryClient();
    const { data: savedTiming } = useScheduleTiming(open);
    const firstMatchValue = firstMatchAt ?? savedTiming?.first_match_at ?? '';

    const onSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        setOpen(false);
    };
    const generate = useMutation({
        mutationFn: () =>
            api.generatePracticeSchedule({
                matches_per_team: parseInt(matchesPerTeam, 10),
                teams_per_alliance: parseInt(teamsPerAlliance, 10),
                first_match_at: firstMatchValue,
                cycle_minutes: parseInt(cycleMinutes, 10),
            }),
        onSuccess,
        onError: (err: unknown) => setError(apiErrorMessage(err, 'Could not build the practice schedule.')),
    });
    const remove = useMutation({
        mutationFn: () => api.deletePracticeSchedule(),
        onSuccess,
        onError: (err: unknown) => setError(apiErrorMessage(err, 'Could not delete the practice schedule.')),
    });

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                setOpen(v);
                setError('');
                setFirstMatchAt(null);
            }}
        >
            <DialogTrigger asChild>
                <button type="button" className={`${bs.btnSecondary} ml-2`}>
                    Practice Match Schedule
                </button>
            </DialogTrigger>
            <DialogContent className={modalContent}>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        setError('');
                        generate.mutate();
                    }}
                >
                    <div className={modalHeader}>
                        <DialogTitle className={modalTitle}>Practice Match Schedule</DialogTitle>
                        <DialogDescription className="mt-2 text-base text-[#212529]">
                            Practice matches are played and scored like any other match, but never count toward the rankings.
                            {hasPractice && ' Generating again replaces the current practice matches.'}
                        </DialogDescription>
                    </div>
                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="practice-mpt" className={bs.formLabel}>
                                Matches per team
                            </label>
                            <input
                                className={bs.formControl}
                                id="practice-mpt"
                                type="number"
                                min="1"
                                max="10"
                                value={matchesPerTeam}
                                onChange={(e) => setMatchesPerTeam(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="practice-tpa" className={bs.formLabel}>
                                Teams per alliance
                            </label>
                            <input
                                className={bs.formControl}
                                id="practice-tpa"
                                type="number"
                                min="1"
                                max="4"
                                value={teamsPerAlliance}
                                onChange={(e) => setTeamsPerAlliance(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="practice-start" className={bs.formLabel}>
                                First match
                            </label>
                            <input
                                className={bs.formControl}
                                id="practice-start"
                                type="datetime-local"
                                value={firstMatchValue}
                                onChange={(e) => setFirstMatchAt(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="practice-cycle" className={bs.formLabel}>
                                Minutes between matches
                            </label>
                            <input
                                className={bs.formControl}
                                id="practice-cycle"
                                type="number"
                                min="1"
                                max="60"
                                value={cycleMinutes}
                                onChange={(e) => setCycleMinutes(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    {error && <p className={`px-4 pb-4 ${bs.textDanger}`}>{error}</p>}
                    <div className={modalFooter}>
                        {hasPractice && (
                            <button type="button" className={`${bs.btnWarning} mr-auto`} disabled={remove.isPending} onClick={() => remove.mutate()}>
                                Clear Matches
                            </button>
                        )}
                        <button type="submit" className={bs.btnPrimary} disabled={generate.isPending || firstMatchValue === ''}>
                            Run Matchmaker
                        </button>
                    </div>
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
                <button type="button" className={`${bs.btnWarning} ml-2`}>
                    Clear Matches
                </button>
            </DialogTrigger>
            <DialogContent className={modalContent}>
                <div className={modalHeader}>
                    <DialogTitle className={modalTitle}>Clear Matches</DialogTitle>
                    <DialogDescription className="mt-2 text-base text-[#212529]">
                        Are you sure? This will permanently delete all matches, scores, and alliance assignments. This action cannot be undone.
                    </DialogDescription>
                </div>
                <div className={modalFooter}>
                    <button type="button" className={bs.btnSecondary} onClick={() => setOpen(false)}>
                        Cancel
                    </button>
                    <button type="button" className={bs.btnWarning} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
                        Clear Matches
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function MatchesIndex({ positions, allianceLabels }: MatchesPageProps) {
    const { data: matches = [] } = useMatches();
    const event = usePage<SharedData>().props.event;
    const fieldCount = useFieldCount();

    const teamNumberAt = (match: CompetitionMatch, position: Position): string => {
        const allianceMembers = match.match_alliances.filter((a) => a.alliance.id === position.alliance_id);

        return allianceMembers[position.alliance_pos - 1]?.team?.number ?? '';
    };

    const sections = SCHEDULE_SECTIONS.map((section) => ({ ...section, matches: matches.filter((match) => match.type === section.type) })).filter(
        (section) => section.matches.length > 0,
    );
    const qualificationMatches = matches.filter((match) => match.type === 'qualification');
    const appearances = new Map<number, number>();
    qualificationMatches.forEach((match) =>
        match.match_alliances.forEach((member) => appearances.set(member.team.id, (appearances.get(member.team.id) ?? 0) + 1)),
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Matches" />

            <div>
                <h1 className={`${bs.h1} text-center print:hidden`}>Qualification Match Schedule</h1>
                <div className="print:hidden">
                    <GenerateScheduleDialog />
                    <RetimeScheduleDialog />
                    <PracticeScheduleDialog hasPractice={matches.some((match) => match.type === 'practice')} />
                    <DeleteAllMatchesDialog />
                </div>
                {sections.length > 0 && <div className="print:hidden">Schedule has been generated, see below.</div>}

                {sections.map((section, sectionIndex) => (
                    <div key={section.type} className="mx-auto mt-4 max-w-[1140px]">
                        <div className="relative">
                            <h2 className={`${bs.h2} mx-auto w-1/2 text-center`}>
                                {event?.name} {section.title}
                            </h2>
                            {sectionIndex === 0 && (
                                <button
                                    type="button"
                                    className={`${bs.btnLight} absolute top-0 right-0 print:hidden`}
                                    title="Print"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="inline size-8" />
                                </button>
                            )}
                        </div>
                        {section.type === 'qualification' && (
                            <table className={bs.table}>
                                <tbody>
                                    <tr>
                                        <td className="text-right">Teams:</td>
                                        <td>{appearances.size}</td>
                                        <td className="text-right">Matches Per Team:</td>
                                        <td>{Math.max(0, ...appearances.values())}</td>
                                        <td className="text-right">Matches:</td>
                                        <td>{qualificationMatches.length}</td>
                                    </tr>
                                </tbody>
                            </table>
                        )}
                        <table className={`${bs.table} ${bs.tableStriped} text-center`}>
                            <thead>
                                <tr>
                                    <th scope="col">Start</th>
                                    <th scope="col">Match</th>
                                    {fieldCount > 1 && <th scope="col">Field</th>}
                                    {positions.map((pos) => {
                                        const allianceColor = allianceLabels[pos.alliance_id] ?? 'Alliance';

                                        return (
                                            <th
                                                key={`${pos.alliance_id}-${pos.alliance_pos}`}
                                                scope="col"
                                                className={pos.alliance_pos === 1 ? 'border-l' : ''}
                                            >
                                                {allianceColor.charAt(0).toUpperCase() + allianceColor.slice(1)} {pos.alliance_pos}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {section.matches.map((match) => (
                                    <tr key={match.id}>
                                        <td>{formatMatchTime(match.start_time, event?.timezone)}</td>
                                        <td>{getMatchTitle(match)}</td>
                                        {fieldCount > 1 && <td>{match.field}</td>}
                                        {positions.map((pos) => (
                                            <td
                                                key={`${match.id}-${pos.alliance_id}-${pos.alliance_pos}`}
                                                className={pos.alliance_pos === 1 ? 'border-l' : ''}
                                            >
                                                {teamNumberAt(match, pos)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
