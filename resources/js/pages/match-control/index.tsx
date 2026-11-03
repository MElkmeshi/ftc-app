import { DisplaySwitch } from '@/components/match-control/display-switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { useCancelMatch, useEndMatch, useLoadMatch, useStartMatch } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { eventUrl } from '@/lib/event';
import {
    formatMatchTime,
    formatTime,
    getAllianceMembers,
    getAllianceScore,
    getFieldLabel,
    getMatchTitle,
    getPhaseColors,
    getPhaseLabel,
    scheduleDriftMinutes,
} from '@/lib/match-utils';
import { serverNow } from '@/lib/server-clock';
import { cn } from '@/lib/utils';
import { type AudienceDisplayState, type BreadcrumbItem, type CompetitionMatch, type DisplayModeValue, type SharedData } from '@/types';
import { Head, router, usePage, useProp } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, Clock, ExternalLink, Flag, Megaphone, Octagon, Play, Square, Tablet, TriangleAlert, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface DisplayModeOption {
    value: DisplayModeValue;
    label: string;
}

type MatchFilter = 'qualification' | 'elimination';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Match Control', href: '/match-control' }];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    upcoming: { label: 'Upcoming', className: 'bg-muted text-muted-foreground' },
    ongoing: { label: 'Running', className: 'bg-emerald-500 text-white' },
    completed: { label: 'Played', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
    cancelled: { label: 'Cancelled', className: 'bg-orange-500/15 text-orange-700' },
};

/** Reads the server's message out of a failed API call. */
function errorMessage(error: unknown): string | null {
    if (!error) {
        return null;
    }

    const data = (error as { response?: { data?: unknown } }).response?.data;

    if (typeof data === 'string') {
        try {
            return (JSON.parse(data) as { message?: string }).message ?? 'Something went wrong.';
        } catch {
            return data || 'Something went wrong.';
        }
    }

    return error instanceof Error ? error.message : 'Something went wrong.';
}

function TeamNumbers({ match, color }: { match: CompetitionMatch; color: 'red' | 'blue' }) {
    return (
        <span className={cn('font-mono tabular-nums', color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400')}>
            {getAllianceMembers(match, color)
                .map((member) => member.team.number)
                .join(' · ') || '—'}
        </span>
    );
}

function MatchList({
    matches,
    selectedId,
    onSelect,
}: {
    matches: CompetitionMatch[];
    selectedId: number | null;
    onSelect: (match: CompetitionMatch) => void;
}) {
    const eventTimezone = usePage<SharedData>().props.event?.timezone;
    const fieldCount = useFieldCount();
    const hasPlayoffs = matches.some((match) => match.type === 'elimination');
    const [filter, setFilter] = useState<MatchFilter>(() =>
        matches.some((m) => m.type === 'elimination' && m.status !== 'completed') ? 'elimination' : 'qualification',
    );
    const visible = matches.filter((match) => match.type === filter);

    return (
        <Card className="min-w-0">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <div className="flex items-center gap-3">
                    <CardTitle>Matches</CardTitle>
                    <ScheduleDrift matches={matches} />
                </div>
                {hasPlayoffs && (
                    <div className="flex rounded-md border p-0.5 text-sm">
                        {(['qualification', 'elimination'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setFilter(option)}
                                className={cn(
                                    'rounded px-3 py-1',
                                    filter === option ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
                                )}
                            >
                                {option === 'qualification' ? 'Qualification' : 'Playoffs'}
                            </button>
                        ))}
                    </div>
                )}
            </CardHeader>
            <CardContent className="max-h-[calc(100vh-14rem)] overflow-auto p-0">
                {visible.length === 0 ? (
                    <p className="text-muted-foreground px-6 pb-6 text-sm">No matches yet. Generate a schedule from Schedule &amp; Results.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-card text-muted-foreground sticky top-0 text-left text-xs uppercase">
                            <tr>
                                <th className="px-4 py-2 font-medium">Match</th>
                                <th className="px-2 py-2 font-medium">Time</th>
                                {fieldCount > 1 && <th className="px-2 py-2 font-medium">Field</th>}
                                <th className="px-2 py-2 font-medium">Red</th>
                                <th className="px-2 py-2 font-medium">Blue</th>
                                <th className="px-2 py-2 text-center font-medium">Score</th>
                                <th className="px-4 py-2 text-right font-medium">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visible.map((match) => {
                                const badge = STATUS_BADGES[match.status] ?? STATUS_BADGES.upcoming;

                                return (
                                    <tr
                                        key={match.id}
                                        onClick={() => onSelect(match)}
                                        className={cn(
                                            'hover:bg-muted/50 cursor-pointer border-t transition',
                                            match.id === selectedId && 'bg-primary/10 hover:bg-primary/15',
                                            match.status === 'ongoing' && 'font-semibold',
                                        )}
                                    >
                                        <td className="px-4 py-2 whitespace-nowrap">{getMatchTitle(match)}</td>
                                        <td className="text-muted-foreground px-2 py-2 whitespace-nowrap tabular-nums">
                                            {formatMatchTime(match.start_time, eventTimezone)}
                                        </td>
                                        {fieldCount > 1 && <td className="px-2 py-2 tabular-nums">{match.field}</td>}
                                        <td className="px-2 py-2">
                                            <TeamNumbers match={match} color="red" />
                                        </td>
                                        <td className="px-2 py-2">
                                            <TeamNumbers match={match} color="blue" />
                                        </td>
                                        <td className="px-2 py-2 text-center font-mono whitespace-nowrap tabular-nums">
                                            {match.status === 'upcoming'
                                                ? ''
                                                : `${getAllianceScore(match, 'red')} – ${getAllianceScore(match, 'blue')}`}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            <span className={cn('rounded-full px-2 py-0.5 text-xs', badge.className)}>{badge.label}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </CardContent>
        </Card>
    );
}

/** Updates every 15 seconds on the server's clock, for the ahead/behind badge. */
function useServerNow(): number {
    const [now, setNow] = useState(() => serverNow());

    useEffect(() => {
        const id = setInterval(() => setNow(serverNow()), 15000);

        return () => clearInterval(id);
    }, []);

    return now;
}

/** FTC Live's "x minutes behind" indicator. */
function ScheduleDrift({ matches }: { matches: CompetitionMatch[] }) {
    const drift = scheduleDriftMinutes(matches, useServerNow());

    if (drift === null) {
        return null;
    }

    const [label, className] =
        Math.abs(drift) <= 1
            ? ['On schedule', 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300']
            : drift > 0
              ? [
                    `${drift} min behind`,
                    drift > 10 ? 'bg-red-500/15 text-red-700 dark:text-red-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
                ]
              : [`${-drift} min ahead`, 'bg-sky-500/15 text-sky-700 dark:text-sky-300'];

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium', className)}>
            <Clock className="size-3.5" /> {label}
        </span>
    );
}

/**
 * Where an alliance's referee is during a running match: submitted, still
 * scoring on a tablet (two tablets is a warning), or no tablet connected.
 */
function RefereeStatus({ match, color, tablets }: { match: CompetitionMatch; color: 'red' | 'blue'; tablets: string[] }) {
    const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;
    const submission = match.submissions?.find((entry) => entry.alliance_id === allianceId);

    if (submission) {
        return (
            <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="size-3.5" /> Submitted by {submission.by}
            </p>
        );
    }

    if (tablets.length > 1) {
        return (
            <p className="text-destructive mt-2 flex items-center gap-1 text-xs font-semibold">
                <TriangleAlert className="size-3.5" /> {tablets.length} tablets: {tablets.join(', ')}
            </p>
        );
    }

    return (
        <p className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
            <Tablet className="size-3.5" /> {tablets.length === 1 ? `Scoring: ${tablets[0]}` : 'No referee tablet'}
        </p>
    );
}

function AllianceSummary({ match, color, tablets }: { match: CompetitionMatch; color: 'red' | 'blue'; tablets?: string[] }) {
    return (
        <div
            className={cn(
                'min-w-0 flex-1 rounded-lg border-2 p-3',
                color === 'red' ? 'border-red-500/60 bg-red-500/5' : 'border-blue-500/60 bg-blue-500/5',
            )}
        >
            <div className="flex items-baseline justify-between">
                <span
                    className={cn(
                        'text-xs font-semibold uppercase',
                        color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400',
                    )}
                >
                    {color}
                </span>
                <span className="text-3xl font-black tabular-nums">{getAllianceScore(match, color)}</span>
            </div>
            <ul className="mt-2 space-y-0.5 text-sm">
                {getAllianceMembers(match, color).map((member) => (
                    <li key={member.id} className="truncate">
                        <span className="font-mono font-semibold">{member.team.number}</span> {member.team.name}
                    </li>
                ))}
            </ul>
            {match.status === 'ongoing' && tablets && <RefereeStatus match={match} color={color} tablets={tablets} />}
        </div>
    );
}

type ConsoleTab = 'matches' | 'displays';

const CONSOLE_TABS: { value: ConsoleTab; label: string }[] = [
    { value: 'matches', label: 'Matches' },
    { value: 'displays', label: 'Displays' },
];

/** The open tab is kept in the address (#displays), like FTC Live's match control tabs. */
function useConsoleTab(): [ConsoleTab, (tab: ConsoleTab) => void] {
    const [tab, setTab] = useState<ConsoleTab>(() => (window.location.hash === '#displays' ? 'displays' : 'matches'));

    const changeTab = (next: ConsoleTab) => {
        setTab(next);
        window.history.replaceState(window.history.state, '', next === 'matches' ? window.location.pathname : '#displays');
    };

    return [tab, changeTab];
}

export default function MatchControlConsole() {
    const fieldCount = useFieldCount();
    const [tab, changeTab] = useConsoleTab();
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const { value: display } = useProp<AudienceDisplayState>('display');
    const { value: displayModes = [] } = useProp<DisplayModeOption[]>('displayModes');

    const api = useApi();
    const loadMatch = useLoadMatch();
    const startMatch = useStartMatch();
    const endMatch = useEndMatch();
    const cancelMatch = useCancelMatch();

    // The operator who clicked sees the outcome at once, without waiting for
    // the broadcast round trip (which also covers a backgrounded console tab).
    const refresh = { onSuccess: () => router.reload({ only: ['matches', 'display'] }) };
    const { timer, matchConfig } = useActiveMatchTimer();

    const [chosenId, setChosenId] = useState<number | null>(null);
    const [confirmingAbort, setConfirmingAbort] = useState(false);
    const [confirmingForce, setConfirmingForce] = useState(false);
    const [displayError, setDisplayError] = useState<string | null>(null);

    const ongoing = matches.find((match) => match.status === 'ongoing') ?? null;
    const nextUpcoming = matches.find((match) => match.status === 'upcoming') ?? null;

    // Follow the field: the running match wins, then whatever is on the display, then the next match to play.
    const selected = useMemo(
        () =>
            matches.find((match) => match.id === chosenId) ??
            ongoing ??
            matches.find((match) => match.id === display?.match_id) ??
            nextUpcoming ??
            null,
        [matches, chosenId, ongoing, display?.match_id, nextUpcoming],
    );

    // Which tablets are scoring each alliance of the running match.
    const { data: seats } = useQuery({
        queryKey: ['referee-seats', selected?.id],
        queryFn: () => api.getRefereeSeats(selected!.id),
        enabled: selected?.status === 'ongoing',
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });
    const tabletsFor = (color: 'red' | 'blue') => (selected ? (seats?.seats[String(getAllianceMembers(selected, color)[0]?.alliance.id)] ?? []) : []);
    const awaitingSubmission =
        selected?.status === 'ongoing'
            ? (['red', 'blue'] as const).filter((color) => {
                  const allianceId = getAllianceMembers(selected, color)[0]?.alliance.id;
                  return allianceId !== undefined && !selected.submissions?.some((entry) => entry.alliance_id === allianceId);
              })
            : [];

    const isLoaded = selected !== null && display?.match_id === selected.id && display.mode === 'preview';
    const busy = loadMatch.isPending || startMatch.isPending || endMatch.isPending || cancelMatch.isPending;
    const error = errorMessage(loadMatch.error ?? startMatch.error ?? endMatch.error ?? cancelMatch.error) ?? displayError;
    const phaseColors = getPhaseColors(timer.phase);

    const show = (mode: DisplayModeValue, matchId?: number | null, message?: string) => {
        setDisplayError(null);
        api.setAudienceDisplay(mode, matchId, message)
            .then(() => router.reload({ only: ['display'] }))
            .catch((e) => setDisplayError(errorMessage(e)));
    };

    const selectNext = () => {
        const index = selected ? matches.findIndex((match) => match.id === selected.id) : -1;
        const next = matches.slice(index + 1).find((match) => match.status === 'upcoming') ?? nextUpcoming;
        setChosenId(next?.id ?? null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Match Control" />

            <div className="space-y-4 p-4">
                <div className="flex gap-1 border-b" role="tablist">
                    {CONSOLE_TABS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="tab"
                            aria-selected={tab === option.value}
                            onClick={() => changeTab(option.value)}
                            className={cn(
                                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition',
                                tab === option.value
                                    ? 'border-primary text-foreground'
                                    : 'text-muted-foreground hover:text-foreground border-transparent',
                            )}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                {displayError && tab === 'displays' && <p className="text-destructive text-sm">{displayError}</p>}

                {tab === 'displays' ? (
                    <DisplaySwitch display={display} onShow={(mode, message) => show(mode, null, message)} />
                ) : (
                    <>
                        <Card>
                            <CardContent className="flex flex-wrap items-center gap-2 py-3">
                                <span className="text-muted-foreground mr-2 text-sm font-medium">Audience display:</span>
                                {displayModes
                                    .filter((mode) => mode.value !== 'message')
                                    .map((mode) => (
                                        <Button
                                            key={mode.value}
                                            size="sm"
                                            variant={display?.mode === mode.value ? 'default' : 'outline'}
                                            onClick={() =>
                                                show(mode.value, ['preview', 'match', 'results'].includes(mode.value) ? selected?.id : null)
                                            }
                                        >
                                            {mode.label}
                                        </Button>
                                    ))}
                                <Button asChild size="sm" variant="ghost" className="ml-auto">
                                    <a href={eventUrl('/display?type=audience')} target="_blank" rel="noreferrer">
                                        <ExternalLink className="mr-1 size-4" /> Open display
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>

                        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(22rem,2fr)]">
                            <MatchList matches={matches} selectedId={selected?.id ?? null} onSelect={(match) => setChosenId(match.id)} />

                            <Card className="h-fit xl:sticky xl:top-4">
                                {selected ? (
                                    <>
                                        <CardHeader className="space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <CardTitle className="text-2xl">{getMatchTitle(selected)}</CardTitle>
                                                <Badge className={(STATUS_BADGES[selected.status] ?? STATUS_BADGES.upcoming).className}>
                                                    {(STATUS_BADGES[selected.status] ?? STATUS_BADGES.upcoming).label}
                                                </Badge>
                                            </div>
                                            {getFieldLabel(selected, fieldCount) && (
                                                <p className="text-muted-foreground text-sm font-medium">{getFieldLabel(selected, fieldCount)}</p>
                                            )}
                                            {isLoaded && (
                                                <p className="text-sm text-emerald-600">Loaded — the audience display is showing the preview.</p>
                                            )}
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex gap-3">
                                                <AllianceSummary match={selected} color="red" tablets={tabletsFor('red')} />
                                                <AllianceSummary match={selected} color="blue" tablets={tabletsFor('blue')} />
                                            </div>

                                            {selected.status === 'ongoing' && (
                                                <div className="bg-muted rounded-lg p-4 text-center">
                                                    <div className={cn('text-sm font-bold tracking-widest', phaseColors.text)}>
                                                        {getPhaseLabel(timer.phase)}
                                                    </div>
                                                    <div className="text-5xl font-black tabular-nums">
                                                        {timer.phase === 'autonomous'
                                                            ? formatTime(timer.phaseRemainingSeconds + (matchConfig?.timing.teleop ?? 120))
                                                            : formatTime(timer.phase === 'pre-match' ? 0 : timer.phaseRemainingSeconds)}
                                                    </div>
                                                    <div className="bg-background mt-2 h-2 overflow-hidden rounded-full">
                                                        <div
                                                            className={cn('h-full', phaseColors.bg)}
                                                            style={{ width: `${timer.progressPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {error && <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-sm">{error}</p>}

                                            <div className="grid gap-2">
                                                {selected.status === 'upcoming' && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            disabled={busy || isLoaded}
                                                            onClick={() => loadMatch.mutate(selected.id, refresh)}
                                                        >
                                                            <Upload className="mr-1 size-4" /> {isLoaded ? 'Loaded' : 'Load match & show preview'}
                                                        </Button>
                                                        <Button
                                                            size="lg"
                                                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                                                            disabled={busy || ongoing !== null}
                                                            onClick={() => startMatch.mutate(selected.id, refresh)}
                                                        >
                                                            <Play className="mr-1 size-5" /> Start match
                                                        </Button>
                                                        {ongoing && (
                                                            <p className="text-muted-foreground text-xs">
                                                                {getMatchTitle(ongoing)} is still running.
                                                            </p>
                                                        )}
                                                    </>
                                                )}

                                                {selected.status === 'ongoing' && (
                                                    <>
                                                        {confirmingAbort ? (
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <Button
                                                                    variant="destructive"
                                                                    disabled={busy}
                                                                    onClick={() => {
                                                                        setConfirmingAbort(false);
                                                                        cancelMatch.mutate(selected.id, refresh);
                                                                    }}
                                                                >
                                                                    Yes, abort
                                                                </Button>
                                                                <Button variant="outline" onClick={() => setConfirmingAbort(false)}>
                                                                    Keep running
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <Button
                                                                size="lg"
                                                                variant="destructive"
                                                                disabled={busy}
                                                                onClick={() => setConfirmingAbort(true)}
                                                            >
                                                                <Octagon className="mr-1 size-5" /> Abort match
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="lg"
                                                            disabled={busy || awaitingSubmission.length > 0}
                                                            onClick={() => endMatch.mutate(selected.id, refresh)}
                                                        >
                                                            <CheckCircle className="mr-1 size-5" />
                                                            {awaitingSubmission.length > 0
                                                                ? `Waiting for ${awaitingSubmission.join(' and ')} to submit`
                                                                : 'Commit scores & end match'}
                                                        </Button>
                                                        {awaitingSubmission.length > 0 &&
                                                            (confirmingForce ? (
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <Button
                                                                        variant="outline"
                                                                        className="border-amber-500 text-amber-700 dark:text-amber-400"
                                                                        disabled={busy}
                                                                        onClick={() => {
                                                                            setConfirmingForce(false);
                                                                            endMatch.mutate({ matchId: selected.id, force: true }, refresh);
                                                                        }}
                                                                    >
                                                                        Yes, commit now
                                                                    </Button>
                                                                    <Button variant="outline" onClick={() => setConfirmingForce(false)}>
                                                                        Wait for referees
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <Button variant="outline" disabled={busy} onClick={() => setConfirmingForce(true)}>
                                                                    <Square className="mr-1 size-4" /> Commit without waiting
                                                                </Button>
                                                            ))}
                                                        <p className="text-muted-foreground text-xs">
                                                            Referees submit each alliance's scores from their tablets; the match ends once you commit.
                                                            Abort puts the match back to upcoming so it can be replayed. Scores are kept.
                                                        </p>
                                                    </>
                                                )}

                                                {selected.status === 'completed' && (
                                                    <>
                                                        <Button
                                                            size="lg"
                                                            disabled={display?.mode === 'results' && display.match_id === selected.id}
                                                            onClick={() => show('results', selected.id)}
                                                        >
                                                            <Megaphone className="mr-1 size-5" />
                                                            {display?.mode === 'results' && display.match_id === selected.id
                                                                ? 'Results posted'
                                                                : 'Post results to display'}
                                                        </Button>
                                                        <Button asChild variant="outline">
                                                            <a href={eventUrl('/referee/scoring')}>
                                                                <Flag className="mr-1 size-4" /> Review scores
                                                            </a>
                                                        </Button>
                                                    </>
                                                )}

                                                <Button variant="ghost" onClick={selectNext} disabled={!nextUpcoming}>
                                                    Next match <ChevronRight className="ml-1 size-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </>
                                ) : (
                                    <CardContent className="text-muted-foreground py-10 text-center text-sm">
                                        Select a match to control it.
                                    </CardContent>
                                )}
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
