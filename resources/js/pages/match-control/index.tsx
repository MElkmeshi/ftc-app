import { CONSOLE_TABS, type ConsoleTab, MatchControlTabs } from '@/components/match-control-tabs';
import { AllianceSelectionPanel } from '@/components/match-control/alliance-selection-panel';
import { DisplaySwitch } from '@/components/match-control/display-switch';
import { MatchTimingPanel } from '@/components/match-control/match-timing-panel';
import { TeamCards } from '@/components/match-control/team-cards';
import { TeamCardBadge } from '@/components/team-card-badge';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { useCancelMatch, useEndMatch, useLoadMatch, useStartMatch } from '@/hooks/use-match';
import { useMatchControlSettings } from '@/hooks/use-match-control-settings';
import { eventUrl } from '@/lib/event';
import {
    formatTime,
    getAllianceMembers,
    getAllianceScore,
    getMatchTitle,
    isTestMatch,
    scheduleDriftMinutes,
    teamNumberLabel,
} from '@/lib/match-utils';
import { findSubmission, seatsOf } from '@/lib/referee-seats';
import { serverNow } from '@/lib/server-clock';
import { cn } from '@/lib/utils';
import {
    type AudienceDisplayState,
    type CompetitionMatch,
    type DisplayModeValue,
    type MatchControlSettings,
    type RefereeRole,
    type SharedData,
} from '@/types';
import { Head, Link, router, usePage, useProp } from '@inertiajs/react';
import { useConnectionStatus } from '@laravel/echo-react';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';

type MatchPhase = CompetitionMatch['type'] | 'test';

const phaseOf = (match: CompetitionMatch): MatchPhase => (isTestMatch(match) ? 'test' : match.type);

const MATCH_PHASES: { value: MatchPhase; label: string }[] = [
    { value: 'test', label: 'Test' },
    { value: 'practice', label: 'Practice' },
    { value: 'qualification', label: 'Qualification' },
    { value: 'elimination', label: 'Playoffs' },
];

const STATE_LABELS: Record<CompetitionMatch['status'], string> = {
    upcoming: 'UNPLAYED',
    ongoing: 'RUNNING',
    completed: 'COMMITTED',
    cancelled: 'CANCELLED',
};

const ROLE_LABELS: Record<RefereeRole, string> = { scoring: 'Scoring', penalty: 'Penalties' };

const headerButtonClass =
    'rounded-md border px-3.5 py-2 leading-tight whitespace-pre-line disabled:pointer-events-none disabled:opacity-65 border-[#f8f9fa] bg-[#f8f9fa] text-black hover:bg-[#d3d4d5]';
const HEADER_TONES = {
    success: 'border-[#198754] bg-[#198754] text-white hover:bg-[#157347]',
    warning: 'border-[#ffc107] bg-[#ffc107] text-black hover:bg-[#ffca2c]',
    danger: 'border-[#dc3545] bg-[#dc3545] text-white hover:bg-[#bb2d3b]',
};
const rowButtonClass =
    'rounded-[3px] border border-[#f8f9fa] bg-[#f8f9fa] px-1.5 text-sm leading-[20px] text-black hover:bg-[#d3d4d5] disabled:opacity-65';

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

function currentPhase(matches: CompetitionMatch[]): MatchPhase {
    const phases = MATCH_PHASES.filter((option) => matches.some((match) => phaseOf(match) === option.value));
    const ofPhase = (phase: MatchPhase) => matches.filter((match) => phaseOf(match) === phase);
    const startedIndex = phases.findLastIndex((phase) =>
        ofPhase(phase.value).some((match) => match.status === 'ongoing' || match.status === 'completed'),
    );

    if (startedIndex === -1) {
        return phases[0]?.value ?? 'qualification';
    }

    const finished = ofPhase(phases[startedIndex].value).every((match) => match.status === 'completed' || match.status === 'cancelled');

    return finished && phases[startedIndex + 1] ? phases[startedIndex + 1].value : phases[startedIndex].value;
}

function awaitingSubmissions(match: CompetitionMatch | null, settings: MatchControlSettings): string[] {
    if (match?.status !== 'ongoing' || !settings.live_scoring) {
        return [];
    }

    return (['red', 'blue'] as const).flatMap((color) => {
        const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;

        return allianceId === undefined
            ? []
            : seatsOf(match, allianceId)
                  .filter((role) => role === 'scoring' || settings.referee_tablets)
                  .filter((role) => !findSubmission(match, allianceId, role))
                  .map((role) => `${color} ${role === 'penalty' ? 'penalties' : 'scoring'}`);
    });
}

function useServerNow(): number {
    const [now, setNow] = useState(() => serverNow());

    useEffect(() => {
        const id = setInterval(() => setNow(serverNow()), 15000);

        return () => clearInterval(id);
    }, []);

    return now;
}

function useConsoleTab(): [ConsoleTab, (tab: ConsoleTab) => void] {
    const [tab, setTab] = useState<ConsoleTab>(() => {
        const requested = window.location.hash.slice(1);

        return CONSOLE_TABS.some((option) => option.value === requested) ? (requested as ConsoleTab) : 'schedule';
    });

    const changeTab = (next: ConsoleTab) => {
        setTab(next);
        window.history.replaceState(window.history.state, '', next === 'schedule' ? window.location.pathname : `#${next}`);
    };

    return [tab, changeTab];
}

function ScheduleTable({
    matches,
    display,
    busy,
    hasRunningMatch,
    onPlay,
    onPost,
    onReplay,
}: {
    matches: CompetitionMatch[];
    display: AudienceDisplayState | undefined;
    busy: boolean;
    hasRunningMatch: boolean;
    onPlay: (match: CompetitionMatch) => void;
    onPost: (match: CompetitionMatch) => void;
    onReplay: (match: CompetitionMatch) => void;
}) {
    const fieldCount = useFieldCount();
    const teamsPerAlliance = Math.max(1, ...matches.map((match) => getAllianceMembers(match, 'red').length));
    const slots = Array.from({ length: teamsPerAlliance }, (_, index) => index);

    if (matches.length === 0) {
        return <p className="p-3">No matches. Create the schedule from Schedule &amp; Results.</p>;
    }

    return (
        <table className="text-center text-sm">
            <thead className="sticky top-0 bg-[#375d6b] text-base">
                <tr>
                    <th className="px-1">Match</th>
                    {fieldCount > 1 && <th className="px-1">Field</th>}
                    <th className="px-1">State</th>
                    <th className="px-1">Red Score</th>
                    {slots.map((slot) => (
                        <th key={`red-${slot}`} className="px-1">
                            Red {slot + 1}
                        </th>
                    ))}
                    {slots.map((slot) => (
                        <th key={`blue-${slot}`} className="px-1">
                            Blue {slot + 1}
                        </th>
                    ))}
                    <th className="px-1">Blue Score</th>
                    <th colSpan={3} />
                </tr>
            </thead>
            <tbody>
                {matches.map((match) => {
                    const red = getAllianceMembers(match, 'red');
                    const blue = getAllianceMembers(match, 'blue');
                    const posted = display?.mode === 'results' && display.match_id === match.id;

                    return (
                        <tr key={match.id} className={cn('odd:bg-[#375d6b]', match.status === 'ongoing' && 'font-bold')}>
                            <td className="px-1 py-px whitespace-nowrap">{getMatchTitle(match)}</td>
                            {fieldCount > 1 && <td className="px-1">{match.field}</td>}
                            <td className="px-1">{STATE_LABELS[match.status]}</td>
                            <td className="px-1 tabular-nums">{getAllianceScore(match, 'red')}</td>
                            {slots.map((slot) => (
                                <td key={`red-${slot}`} className="px-1 tabular-nums">
                                    {teamNumberLabel(red[slot])} <TeamCardBadge card={red[slot]?.card} />
                                </td>
                            ))}
                            {slots.map((slot) => (
                                <td key={`blue-${slot}`} className="px-1 tabular-nums">
                                    {teamNumberLabel(blue[slot])} <TeamCardBadge card={blue[slot]?.card} />
                                </td>
                            ))}
                            <td className="px-1 tabular-nums">{getAllianceScore(match, 'blue')}</td>
                            <td className="px-1 py-px">
                                {match.status === 'upcoming' && (
                                    <button type="button" className={rowButtonClass} disabled={busy || hasRunningMatch} onClick={() => onPlay(match)}>
                                        Play
                                    </button>
                                )}
                                {match.status === 'completed' && (
                                    <button
                                        type="button"
                                        className={rowButtonClass}
                                        disabled={busy || hasRunningMatch}
                                        onClick={() => onReplay(match)}
                                    >
                                        Replay
                                    </button>
                                )}
                            </td>
                            <td className="px-1 py-px">
                                {match.status === 'upcoming' && (
                                    <Link href={eventUrl(`/matches/${match.id}/edit`)} className={cn(rowButtonClass, 'inline-block')}>
                                        Enter Scores
                                    </Link>
                                )}
                                {match.status === 'completed' && (
                                    <button type="button" className={rowButtonClass} disabled={posted} onClick={() => onPost(match)}>
                                        {posted ? 'Posted' : 'Post'}
                                    </button>
                                )}
                            </td>
                            <td className="px-1 py-px">
                                {match.status === 'completed' && (
                                    <Link href={eventUrl(`/matches/${match.id}/edit`)} className={cn(rowButtonClass, 'inline-block')}>
                                        Edit
                                    </Link>
                                )}
                                {match.status !== 'upcoming' && (
                                    <a href={eventUrl(`/matches/${match.id}/history`)} className={cn(rowButtonClass, 'ml-2 inline-block')}>
                                        History
                                    </a>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

function RefereeStatus({ match, allianceId, role, tablets }: { match: CompetitionMatch; allianceId: number; role: RefereeRole; tablets: string[] }) {
    const submission = findSubmission(match, allianceId, role);
    const label = ROLE_LABELS[role];

    if (submission) {
        return (
            <p className="font-bold">
                ✓ {label}: submitted by {submission.by}
            </p>
        );
    }

    if (tablets.length > 1) {
        return (
            <p className="bg-[#ffc107] px-1 font-bold text-black">
                {label}: {tablets.length} tablets ({tablets.join(', ')})
            </p>
        );
    }

    return (
        <p>
            {label}: {tablets.length === 1 ? tablets[0] : 'no tablet'}
        </p>
    );
}

function AllianceHalf({
    match,
    color,
    tablets,
}: {
    match: CompetitionMatch;
    color: 'red' | 'blue';
    tablets: Partial<Record<RefereeRole, string[]>>;
}) {
    const members = getAllianceMembers(match, color);
    const allianceId = members[0]?.alliance.id;
    const roles: RefereeRole[] = tablets.penalty?.length ? ['scoring', 'penalty'] : allianceId === undefined ? [] : seatsOf(match, allianceId);

    return (
        <div className={cn('flex flex-1 flex-col items-center gap-3 p-4 text-black', color === 'blue' ? 'bg-[#62a8fb]' : 'bg-[#fd5f5f]')}>
            <div className="w-full max-w-sm border border-white/70 bg-white text-center">
                <div className={cn('py-1 text-lg font-bold text-white', color === 'blue' ? 'bg-[#0d6efd]' : 'bg-[#dc3545]')}>
                    {color === 'blue' ? 'Blue' : 'Red'} Alliance
                </div>
                <div className="py-2 text-6xl tabular-nums">{getAllianceScore(match, color)}</div>
            </div>
            <ul className="w-full max-w-sm space-y-1">
                {members.map((member) => (
                    <li key={member.id} className="truncate text-lg">
                        <span className="font-bold tabular-nums">{member.team.number}</span> <TeamCardBadge card={member.card} /> {member.team.name}
                    </li>
                ))}
            </ul>
            {match.status === 'ongoing' && allianceId !== undefined && (
                <fieldset className="w-full max-w-sm border border-black/40 px-2 pb-1">
                    <legend className="px-1">Referees</legend>
                    {roles.map((role) => (
                        <RefereeStatus key={role} match={match} allianceId={allianceId} role={role} tablets={tablets[role] ?? []} />
                    ))}
                </fieldset>
            )}
        </div>
    );
}

function ActiveMatchPanel({
    match,
    matches,
    busy,
    settings,
    onAbort,
    onForceCommit,
}: {
    match: CompetitionMatch | null;
    matches: CompetitionMatch[];
    busy: boolean;
    settings: MatchControlSettings;
    onAbort: (match: CompetitionMatch) => void;
    onForceCommit: (match: CompetitionMatch) => void;
}) {
    const api = useApi();
    const [confirming, setConfirming] = useState<'abort' | 'force' | null>(null);
    const { data: seats } = useQuery({
        queryKey: ['referee-seats', match?.id],
        queryFn: () => api.getRefereeSeats(match!.id),
        enabled: match?.status === 'ongoing',
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });

    if (!match) {
        return <p className="p-3 text-center text-lg">No Active Match</p>;
    }

    const tabletsFor = (color: 'red' | 'blue') => seats?.seats[String(getAllianceMembers(match, color)[0]?.alliance.id)] ?? {};
    const awaiting = awaitingSubmissions(match, settings);
    const [left, right] = settings.flip_alliances ? (['red', 'blue'] as const) : (['blue', 'red'] as const);

    return (
        <div className="flex min-h-full flex-col">
            <div className="flex flex-1 flex-col md:flex-row">
                <AllianceHalf match={match} color={left} tablets={tabletsFor(left)} />
                <AllianceHalf match={match} color={right} tablets={tabletsFor(right)} />
            </div>
            <div className="space-y-3 bg-[#334c55] p-3">
                {(match.status === 'ongoing' || match.status === 'completed') && (
                    <div className="rounded-md bg-white p-3 text-black">
                        <TeamCards match={match} matches={matches} />
                    </div>
                )}
                {match.status === 'ongoing' && (
                    <div className="flex flex-wrap items-center gap-2">
                        {confirming === 'abort' ? (
                            <>
                                <span>Abort {getMatchTitle(match)}? It goes back to unplayed; scores are kept.</span>
                                <button
                                    type="button"
                                    className="rounded-md bg-[#dc3545] px-3 py-1.5 text-white"
                                    disabled={busy}
                                    onClick={() => {
                                        setConfirming(null);
                                        onAbort(match);
                                    }}
                                >
                                    Yes, abort
                                </button>
                                <button type="button" className={headerButtonClass} onClick={() => setConfirming(null)}>
                                    Keep running
                                </button>
                            </>
                        ) : confirming === 'force' ? (
                            <>
                                <span>Commit without {awaiting.join(' and ')}?</span>
                                <button
                                    type="button"
                                    className="rounded-md bg-[#ffc107] px-3 py-1.5 text-black"
                                    disabled={busy}
                                    onClick={() => {
                                        setConfirming(null);
                                        onForceCommit(match);
                                    }}
                                >
                                    Yes, commit now
                                </button>
                                <button type="button" className={headerButtonClass} onClick={() => setConfirming(null)}>
                                    Wait for referees
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    className="rounded-md bg-[#dc3545] px-3 py-1.5 text-white"
                                    disabled={busy}
                                    onClick={() => setConfirming('abort')}
                                >
                                    Abort Match
                                </button>
                                {awaiting.length > 0 && (
                                    <>
                                        <span>Waiting for {awaiting.join(' and ')} to submit.</span>
                                        <button type="button" className={headerButtonClass} disabled={busy} onClick={() => setConfirming('force')}>
                                            Commit without waiting
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function SyncFooter({ matches }: { matches: CompetitionMatch[] }) {
    const status = useConnectionStatus();
    const drift = scheduleDriftMinutes(
        matches.filter((match) => !isTestMatch(match)),
        useServerNow(),
    );
    const driftLabel = drift === null ? '' : Math.abs(drift) <= 1 ? 'On schedule' : drift > 0 ? `${drift}m behind` : `${-drift}m ahead`;

    return (
        <div className="flex h-[19px] shrink-0 items-center gap-2 bg-[#274555] text-base leading-none">
            <span
                className={cn('h-4 w-2.5 rounded-[3px]', status === 'connected' ? 'bg-[#00ff00]' : 'bg-[#ff0000]')}
                title={status === 'connected' ? 'Live updates connected' : 'Live updates disconnected'}
            />
            {driftLabel}
        </div>
    );
}

function HeaderButton({
    tone,
    className,
    children,
    ...props
}: { tone?: keyof typeof HEADER_TONES; children: ReactNode } & React.ComponentProps<'button'>) {
    return (
        <button type="button" className={cn(headerButtonClass, tone && !props.disabled && HEADER_TONES[tone], className)} {...props}>
            {children}
        </button>
    );
}

function teamNumbers(match: CompetitionMatch, color: 'red' | 'blue'): string {
    return getAllianceMembers(match, color)
        .map((member) => member.team.number)
        .join(', ');
}

function MatchStatusRow({
    label,
    match,
    clock,
    awaiting = false,
}: {
    label: string;
    match: CompetitionMatch | null;
    clock: string;
    awaiting?: boolean;
}) {
    return (
        <tr>
            <th className="p-px pr-2 text-left">{label}</th>
            {match && (
                <>
                    <td className="px-6">{getMatchTitle(match)}</td>
                    <td className="px-6 tabular-nums">{clock}</td>
                    <td className={cn('pr-12 pl-1', awaiting && 'bg-[#fd7e14]')}>Red: {teamNumbers(match, 'red')}</td>
                    <td className={cn('pr-12 pl-1', awaiting && 'bg-[#fd7e14]')}>Blue: {teamNumbers(match, 'blue')}</td>
                </>
            )}
        </tr>
    );
}

const PHASE_NAMES: Record<string, string> = {
    'pre-match': 'Starting',
    autonomous: 'AUTO',
    transition: 'Transition',
    teleop: 'TELEOP',
    endgame: 'TELEOP',
    'post-match': 'Done',
};

export default function MatchControlConsole() {
    const { event, name } = usePage<SharedData>().props;
    const [tab, changeTab] = useConsoleTab();
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const { value: display } = useProp<AudienceDisplayState>('display');

    const api = useApi();
    const loadMatch = useLoadMatch();
    const startMatch = useStartMatch();
    const endMatch = useEndMatch();
    const cancelMatch = useCancelMatch();
    const { timer, matchConfig } = useActiveMatchTimer();
    const { settings } = useMatchControlSettings();
    const [replaying, setReplaying] = useState(false);

    const [phase, setPhase] = useState<MatchPhase>(() => currentPhase(matches));
    const [displayError, setDisplayError] = useState<string | null>(null);

    const refresh = { onSuccess: () => router.reload({ only: ['matches', 'display'] }) };
    const phases = MATCH_PHASES.filter((option) => matches.some((match) => phaseOf(match) === option.value));
    const hasPhase = (wanted: MatchPhase | null) => wanted !== null && phases.some((option) => option.value === wanted);
    const phaseNow: MatchPhase = hasPhase('test')
        ? 'test'
        : hasPhase(settings.active_phase)
          ? (settings.active_phase as MatchPhase)
          : currentPhase(matches.filter((match) => !isTestMatch(match)));
    const ongoing = matches.find((match) => match.status === 'ongoing') ?? null;
    const loaded = matches.find((match) => match.id === display?.loaded_match_id && match.status === 'upcoming') ?? null;
    const nextUpcoming =
        matches.find((match) => phaseOf(match) === phaseNow && match.status === 'upcoming' && match.id !== loaded?.id) ??
        matches.find((match) => !isTestMatch(match) && phaseNow !== 'test' && match.status === 'upcoming' && match.id !== loaded?.id) ??
        null;
    useEffect(() => {
        setPhase(phaseNow);
    }, [phaseNow]);

    const lastCompleted = matches.filter((match) => match.status === 'completed').at(-1) ?? null;
    const awaiting = awaitingSubmissions(ongoing, settings);
    const loadedTeams = loaded?.match_alliances ?? [];
    const notReady = loadedTeams.filter((member) => !member.ready).map((member) => member.team.number);
    const lastPosted = lastCompleted !== null && display?.mode === 'results' && display.match_id === lastCompleted.id;

    const busy = loadMatch.isPending || startMatch.isPending || endMatch.isPending || cancelMatch.isPending || replaying;
    const startBlocked = settings.require_ready && notReady.length > 0;
    const error = errorMessage(loadMatch.error ?? startMatch.error ?? endMatch.error ?? cancelMatch.error) ?? displayError;

    const show = (mode: DisplayModeValue, matchId?: number | null, message?: string) => {
        setDisplayError(null);
        api.setAudienceDisplay(mode, matchId, message)
            .then(() => router.reload({ only: ['display'] }))
            .catch((e) => setDisplayError(errorMessage(e)));
    };

    const commitAndPost = () => {
        if (ongoing) {
            endMatch.mutate(ongoing.id, {
                onSuccess: () => {
                    router.reload({ only: ['matches'] });
                    show('results', ongoing.id);
                },
            });

            return;
        }

        if (lastCompleted) {
            show('results', lastCompleted.id);
        }
    };

    const teleopSeconds = matchConfig?.timing.teleop ?? 120;
    const matchSeconds = (matchConfig?.timing.autonomous ?? 30) + teleopSeconds;
    const matchOver = ongoing !== null && timer.phase === 'post-match';
    const activeSeconds =
        timer.phase === 'autonomous'
            ? timer.phaseRemainingSeconds + teleopSeconds
            : timer.phase === 'pre-match'
              ? matchSeconds
              : timer.phaseRemainingSeconds;
    const showing = (mode: DisplayModeValue, match: CompetitionMatch | null) =>
        match !== null && display?.mode === mode && display.match_id === match.id;
    const shownMatch = ongoing ?? loaded;

    const replayMatch = (match: CompetitionMatch) => {
        if (!confirm(`Replay ${getMatchTitle(match)}? Its result is thrown away and the match is loaded to be played again.`)) {
            return;
        }

        setDisplayError(null);
        setReplaying(true);
        api.replayMatch(match.id)
            .then(() => router.reload({ only: ['matches', 'display'] }))
            .catch((e) => setDisplayError(errorMessage(e)))
            .finally(() => setReplaying(false));
    };

    const abortMatch = () => {
        if (ongoing && confirm(matchOver ? 'Discard this match? Its scores are thrown away.' : 'Abort the running match?')) {
            cancelMatch.mutate(ongoing.id, refresh);
        }
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#334c55] text-[#f8f9fa]">
            <Head title="Match Control" />

            <div className="flex h-[35px] shrink-0 items-center bg-[#293d45] px-2">
                <Link href={`/event/${event?.code}`} className="rounded border border-[#f8f9fa] bg-[#f8f9fa] px-2 py-1 text-sm text-black">
                    Exit
                </Link>
                <span className="ml-auto truncate">
                    <span className="font-mono font-bold">{event?.code}</span> - <span className="italic">{name}</span> running at{' '}
                    {window.location.host}
                </span>
            </div>

            <div className="shrink-0 bg-[#293d45] pb-2.5">
                <h1 className="text-center text-[30px] font-bold">Match Control</h1>
                <div className="flex flex-wrap items-end gap-y-2 px-2">
                    <table className="mx-auto md:ml-[240px]">
                        <tbody>
                            <MatchStatusRow label="Loaded Match:" match={loaded} clock={`${formatTime(matchSeconds)} (Not Started)`} />
                            {loaded && (
                                <tr>
                                    <th className="p-px pr-2 text-left">Teams Ready:</th>
                                    <td colSpan={4} className="px-6">
                                        <span className={cn('mr-2 font-bold', notReady.length === 0 ? 'text-[#75b798]' : 'text-[#ffc107]')}>
                                            {loadedTeams.length - notReady.length}/{loadedTeams.length}
                                        </span>
                                        {loadedTeams.map((member) => (
                                            <span
                                                key={member.id}
                                                title={member.ready ? 'Ready' : 'Not ready'}
                                                className={cn(
                                                    'mr-1 rounded px-1 tabular-nums',
                                                    member.ready ? 'bg-[#198754] text-white' : 'bg-[#6c757d] text-white',
                                                )}
                                            >
                                                {member.team.number}
                                            </span>
                                        ))}
                                    </td>
                                </tr>
                            )}
                            <MatchStatusRow
                                label="Active Match:"
                                match={ongoing}
                                clock={`${formatTime(activeSeconds)} (${PHASE_NAMES[timer.phase] ?? timer.phase})`}
                                awaiting={matchOver && awaiting.length > 0}
                            />
                        </tbody>
                    </table>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-y-2 px-2">
                    <div className="flex flex-wrap gap-4 md:ml-[360px]">
                        <HeaderButton
                            tone="success"
                            disabled={busy || loaded !== null || !nextUpcoming}
                            onClick={() => nextUpcoming && loadMatch.mutate(nextUpcoming.id, refresh)}
                        >
                            {'Load Next\nMatch'}
                        </HeaderButton>
                        <HeaderButton
                            tone={showing('preview', loaded) ? 'warning' : 'success'}
                            disabled={!loaded}
                            onClick={() => loaded && show('preview', loaded.id)}
                        >
                            {'Show\nPreview'}
                        </HeaderButton>
                        <HeaderButton
                            tone={showing('match', shownMatch) ? 'warning' : 'success'}
                            disabled={!shownMatch}
                            onClick={() => shownMatch && show('match', shownMatch.id)}
                        >
                            {'Show\nMatch'}
                        </HeaderButton>
                        {ongoing ? (
                            <HeaderButton tone="danger" disabled={busy} onClick={abortMatch}>
                                {matchOver ? 'Discard\nMatch' : 'Abort\nMatch'}
                            </HeaderButton>
                        ) : (
                            <HeaderButton
                                tone="danger"
                                disabled={busy || !loaded || startBlocked}
                                title={loaded && notReady.length > 0 ? `Not ready: ${notReady.join(', ')}` : undefined}
                                onClick={() => loaded && startMatch.mutate(loaded.id, refresh)}
                            >
                                {'Start\nMatch'}
                            </HeaderButton>
                        )}
                    </div>
                    <HeaderButton
                        className="ml-auto"
                        disabled={busy || (ongoing ? !matchOver || awaiting.length > 0 : !lastCompleted || lastPosted)}
                        title={awaiting.length > 0 ? `Waiting for ${awaiting.join(' and ')} to submit` : undefined}
                        onClick={commitAndPost}
                    >
                        {'Commit & Post\nLast Match'}
                    </HeaderButton>
                </div>
                {error && <p className="mx-2 mt-2 rounded bg-[#f8d7da] px-3 py-1 text-[#842029]">{error}</p>}
            </div>

            <MatchControlTabs active={tab} onSelect={changeTab} />

            <main className="min-h-0 flex-1 overflow-auto">
                {tab === 'schedule' && (
                    <>
                        {phases.length > 1 && (
                            <div className="flex gap-2 px-2 py-1">
                                {phases.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setPhase(option.value)}
                                        className={cn(
                                            rowButtonClass,
                                            phase === option.value && 'border-[#13458f] bg-[#13458f] text-white hover:bg-[#13458f]',
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        <ScheduleTable
                            matches={matches.filter((match) => phaseOf(match) === phase)}
                            display={display}
                            busy={busy}
                            hasRunningMatch={ongoing !== null}
                            onPlay={(match) => loadMatch.mutate(match.id, refresh)}
                            onPost={(match) => show('results', match.id)}
                            onReplay={replayMatch}
                        />
                    </>
                )}
                {tab === 'incomplete' && (
                    <ScheduleTable
                        matches={matches.filter((match) => match.status !== 'completed')}
                        display={display}
                        busy={busy}
                        hasRunningMatch={ongoing !== null}
                        onPlay={(match) => loadMatch.mutate(match.id, refresh)}
                        onPost={(match) => show('results', match.id)}
                        onReplay={replayMatch}
                    />
                )}
                {tab === 'active' && (
                    <ActiveMatchPanel
                        match={ongoing ?? loaded}
                        matches={matches}
                        busy={busy}
                        settings={settings}
                        onAbort={(match) => cancelMatch.mutate(match.id, refresh)}
                        onForceCommit={(match) => endMatch.mutate({ matchId: match.id, force: true }, refresh)}
                    />
                )}
                {tab === 'settings' && (
                    <MatchTimingPanel phase={phaseNow} phases={phases.map((option) => option.value)} hasRunningMatch={ongoing !== null} />
                )}
                {tab === 'alliance' && <AllianceSelectionPanel />}
                {tab === 'video' && (
                    <div className="p-1">
                        <DisplaySwitch display={display} onShow={(mode, message) => show(mode, null, message)} />
                    </div>
                )}
            </main>

            <SyncFooter matches={matches} />
        </div>
    );
}
