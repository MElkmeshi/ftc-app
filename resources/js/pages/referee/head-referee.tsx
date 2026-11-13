import { FoulControls } from '@/components/head-referee/foul-controls';
import { MatchControls } from '@/components/head-referee/match-controls';
import { MeetingNotes } from '@/components/head-referee/meeting-notes';
import { ScoresheetsTab } from '@/components/head-referee/scoresheets-tab';
import { TeamCards } from '@/components/match-control/team-cards';
import { formatScoreName } from '@/components/scoring/score-controls';
import { TeamCardBadge } from '@/components/team-card-badge';
import { useApi } from '@/hooks/use-api';
import { useFieldCount } from '@/hooks/use-field-count';
import { useHeadRefereeDesk } from '@/hooks/use-head-referee-desk';
import { useLoadedMatch, useMatch, useScoreTypes } from '@/hooks/use-match';
import { useMatchControlSettings } from '@/hooks/use-match-control-settings';
import AppLayout from '@/layouts/app-layout';
import { getApiErrorMessage } from '@/lib/api-error';
import { bs } from '@/lib/bootstrap';
import { apiScope } from '@/lib/event';
import { FIRST_TEST_NUMBER, getAllianceMembers, getAllianceScore, getMatchTitle, isTestMatch } from '@/lib/match-utils';
import { findSubmission, seatsOf } from '@/lib/referee-seats';
import { serverNow } from '@/lib/server-clock';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type MatchNote, type RefereeRole, type ScoreType } from '@/types';
import { Head, router, useProp } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Head Referee', href: '/head-referee' }];

const ALLIANCES = ['red', 'blue'] as const;
type Color = (typeof ALLIANCES)[number];

const STATUS_LABELS: Record<string, string> = { upcoming: 'Unplayed', ongoing: 'Running', completed: 'Committed', cancelled: 'Cancelled' };
const TWO_MINUTES_MS = 120_000;

function shortMatchName(match: CompetitionMatch): string {
    if (isTestMatch(match)) {
        return `T${match.number - FIRST_TEST_NUMBER + 1}`;
    }

    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    return match.type === 'qualification' ? `Q${match.number}` : getMatchTitle(match);
}

const ROLE_LABELS: Record<RefereeRole, string> = { scoring: 'Scorer', penalty: 'Referee' };

function ScoreRow({ label, red, blue, flip, className }: { label: ReactNode; red: ReactNode; blue: ReactNode; flip: boolean; className?: string }) {
    const [left, right] = flip ? [blue, red] : [red, blue];

    return (
        <div className={cn('grid grid-cols-[1fr_minmax(8rem,auto)_1fr] items-center gap-2 border-b border-[#dee2e6] py-1 text-center', className)}>
            <div>{left}</div>
            <div className="font-bold">{label}</div>
            <div>{right}</div>
        </div>
    );
}

function TabletStatus({
    match,
    color,
    role,
    tablets,
    step,
}: {
    match: CompetitionMatch;
    color: Color;
    role: RefereeRole;
    tablets: string[];
    step: string | null;
}) {
    const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;

    if (allianceId === undefined) {
        return <span>—</span>;
    }

    if (findSubmission(match, allianceId, role)) {
        return <span className="rounded bg-[#198754] px-2 py-0.5 text-white">Submitted</span>;
    }

    if (tablets.length > 1) {
        return <span className="rounded bg-[#ffc107] px-2 py-0.5 text-black">Conflict: {tablets.join(', ')}</span>;
    }

    return tablets.length === 1 ? (
        <span>
            {step ?? 'Scoring'} ({tablets[0]})
        </span>
    ) : (
        <span className="text-[#dc3545]">No Tablet</span>
    );
}

function countFor(match: CompetitionMatch, color: Color, scoreType: ScoreType): number {
    const scoredFor = scoreType.awarded_to === 'opponent' ? (color === 'red' ? 'blue' : 'red') : color;
    const allianceIds = new Set(getAllianceMembers(match, scoredFor).map((member) => member.alliance.id));

    return (match.scores ?? []).filter((score) => score.score_type_id === scoreType.id && allianceIds.has(score.alliance_id ?? -1)).length;
}

function ScoreGroup({ title, scoreTypes, match, flip }: { title: string; scoreTypes: ScoreType[]; match: CompetitionMatch; flip: boolean }) {
    const [open, setOpen] = useState(true);

    return (
        <details open={open} className="mb-2">
            <summary
                onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    setOpen(!open);
                }}
                className="block w-full cursor-pointer rounded bg-[#6c757d] px-2 py-1 text-center text-sm text-white hover:bg-[#5c636a]"
            >
                {title}
            </summary>
            {scoreTypes.map((scoreType) => (
                <ScoreRow
                    key={scoreType.id}
                    flip={flip}
                    label={<span className="capitalize">{formatScoreName(scoreType.name)}</span>}
                    red={countFor(match, 'red', scoreType)}
                    blue={countFor(match, 'blue', scoreType)}
                />
            ))}
        </details>
    );
}

function ActiveMatchTab({
    match,
    matches,
    onAddNote,
}: {
    match: CompetitionMatch;
    matches: CompetitionMatch[];
    onAddNote: (match: CompetitionMatch) => void;
}) {
    const api = useApi();
    const fieldCount = useFieldCount();
    const [flip, setFlip] = useState(false);
    const [reviewing, setReviewing] = useState(false);
    const toggleReview = () => {
        setReviewing(true);
        api.setReviewRequired(match.id, !match.review_required)
            .then(() => router.reload({ only: ['matches'] }))
            .finally(() => setReviewing(false));
    };
    const { data: scoreTypes = [] } = useScoreTypes();
    const { data: seats } = useQuery({
        queryKey: ['referee-seats', match.id],
        queryFn: () => api.getRefereeSeats(match.id),
        enabled: match.status === 'ongoing' || match.status === 'upcoming',
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });

    const groups = useMemo(() => {
        const byGroup = new Map<string, { order: number; scoreTypes: ScoreType[] }>();
        for (const scoreType of scoreTypes) {
            const name = scoreType.group?.name ?? 'Other';
            const entry = byGroup.get(name) ?? { order: scoreType.group?.display_order ?? Number.MAX_SAFE_INTEGER, scoreTypes: [] };
            entry.scoreTypes.push(scoreType);
            byGroup.set(name, entry);
        }

        return [...byGroup.entries()].sort(([, a], [, b]) => a.order - b.order);
    }, [scoreTypes]);

    const stepFor = (color: Color, role: RefereeRole) => seats?.steps?.[String(getAllianceMembers(match, color)[0]?.alliance.id)]?.[role] ?? null;
    const tabletsFor = (color: Color, role: RefereeRole) => seats?.seats[String(getAllianceMembers(match, color)[0]?.alliance.id)]?.[role] ?? [];
    const roles: RefereeRole[] =
        ALLIANCES.some((color) => {
            const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;

            return allianceId !== undefined && seatsOf(match, allianceId).includes('penalty');
        }) || scoreTypes.some((scoreType) => scoreType.referee === 'penalty')
            ? ['scoring', 'penalty']
            : ['scoring'];

    return (
        <>
            <h4 className={cn(bs.h4, 'mt-4 text-center')}>{getMatchTitle(match)}</h4>
            {fieldCount > 1 && <p className="text-center">Field: {match.field}</p>}
            <p className="text-center">Match Status: {STATUS_LABELS[match.status] ?? match.status}</p>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <button type="button" onClick={() => setFlip(!flip)} className={bs.btnInfo}>
                    Flip Alliances
                </button>
                {match.status !== 'completed' && (
                    <div className="text-center">
                        <button
                            type="button"
                            disabled={reviewing}
                            onClick={toggleReview}
                            className={match.review_required ? bs.btnSuccess : bs.btnWarning}
                        >
                            {match.review_required ? 'Review Required ✓' : 'Review Required?'}
                        </button>
                        {match.review_required && <p className="italic">Scores will be held until you submit completion of review</p>}
                    </div>
                )}
                <button type="button" onClick={() => onAddNote(match)} className={bs.btnInfo}>
                    Add Note
                </button>
            </div>
            <hr className="my-4" />

            <ScoreRow
                flip={flip}
                label="Tablet Status"
                red={<span className="font-bold text-[#ed1c24]">Red</span>}
                blue={<span className="font-bold text-[#0066b3]">Blue</span>}
            />
            {match.status === 'ongoing' || match.status === 'upcoming' ? (
                roles.map((role) => (
                    <ScoreRow
                        key={role}
                        flip={flip}
                        label={ROLE_LABELS[role]}
                        red={<TabletStatus match={match} color="red" role={role} tablets={tabletsFor('red', role)} step={stepFor('red', role)} />}
                        blue={<TabletStatus match={match} color="blue" role={role} tablets={tabletsFor('blue', role)} step={stepFor('blue', role)} />}
                    />
                ))
            ) : (
                <ScoreRow
                    flip={flip}
                    label="State"
                    red={match.status === 'completed' ? 'Committed' : 'Cancelled'}
                    blue={match.status === 'completed' ? 'Committed' : 'Cancelled'}
                />
            )}
            <ScoreRow
                flip={flip}
                label="Score"
                className="text-4xl"
                red={<span className="font-bold text-[#ed1c24] tabular-nums">{getAllianceScore(match, 'red')}</span>}
                blue={<span className="font-bold text-[#0066b3] tabular-nums">{getAllianceScore(match, 'blue')}</span>}
            />
            <hr className="my-4" />

            {groups.map(([name, group]) => (
                <ScoreGroup key={name} title={`${name} Scores`} scoreTypes={group.scoreTypes} match={match} flip={flip} />
            ))}
            <FoulControls match={match} scoreTypes={scoreTypes} flip={flip} />
            <hr className="my-4" />

            <h6 className="mb-2 text-center font-medium">Teams / Cards</h6>
            <ScoreRow
                flip={flip}
                label="Teams"
                red={getAllianceMembers(match, 'red').map((member) => (
                    <div key={member.id}>
                        {member.team.number} <TeamCardBadge card={member.card} />
                    </div>
                ))}
                blue={getAllianceMembers(match, 'blue').map((member) => (
                    <div key={member.id}>
                        {member.team.number} <TeamCardBadge card={member.card} />
                    </div>
                ))}
            />
            <div className="mt-3">
                <TeamCards match={match} matches={matches} />
            </div>
        </>
    );
}

function NoteDialog({ match, onClose }: { match: CompetitionMatch; onClose: () => void }) {
    const api = useApi();
    const queryClient = useQueryClient();
    const [summary, setSummary] = useState('');
    const [detail, setDetail] = useState('');
    const [teams, setTeams] = useState<string[]>([]);
    const save = useMutation({
        mutationFn: () => api.createMatchNote({ match_id: match.id, summary, detail: detail || null, teams }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ['match-notes'] });
            onClose();
        },
    });
    const error = getApiErrorMessage(save.error);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 p-4" role="dialog" aria-modal="true">
            <form
                className="mt-10 w-full max-w-lg rounded-md bg-white p-4 text-left"
                onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    save.mutate();
                }}
            >
                <h5 className="mb-2 text-xl font-medium">Match Note</h5>
                <p>Match: {shortMatchName(match)}</p>
                {ALLIANCES.map((color) => (
                    <p key={color} className="capitalize">
                        {color}:{' '}
                        {getAllianceMembers(match, color)
                            .map((member) => member.team.number)
                            .join(', ')}
                    </p>
                ))}
                <label className="mt-3 block">
                    General/Summary:
                    <input
                        className={bs.formControl}
                        value={summary}
                        maxLength={255}
                        required
                        autoFocus
                        onChange={(e) => setSummary(e.target.value)}
                    />
                </label>
                <label className="mt-3 block">
                    Detail:
                    <textarea className={bs.formControl} rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} />
                </label>
                <p className="mt-3">Tags:</p>
                <div className="flex flex-wrap gap-2">
                    {match.match_alliances.map((member) => {
                        const number = String(member.team.number);
                        const tagged = teams.includes(number);

                        return (
                            <button
                                key={member.id}
                                type="button"
                                aria-pressed={tagged}
                                className={cn(bs.btnSm, 'border', tagged ? 'border-[#0d6efd] bg-[#0d6efd] text-white' : 'border-[#6c757d] bg-white')}
                                onClick={() => setTeams(tagged ? teams.filter((team) => team !== number) : [...teams, number])}
                            >
                                {number}
                            </button>
                        );
                    })}
                </div>
                {error && <p className="mt-3 rounded bg-[#f8d7da] px-3 py-1 text-[#842029]">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" className={bs.btnSecondary} onClick={onClose}>
                        Cancel
                    </button>
                    <button type="submit" className={bs.btnPrimary} disabled={save.isPending}>
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
}

function NoteText({ note, prefix, onDelete }: { note: MatchNote; prefix?: string; onDelete: (note: MatchNote) => void }) {
    return (
        <div className="mb-1 text-left">
            {prefix && <span className="mr-2 font-bold">{prefix}</span>}
            <span className="font-bold">{note.summary}</span>
            {note.detail && <span> — {note.detail}</span>}
            {(note.teams ?? []).map((team) => (
                <span key={team} className="ml-2 rounded bg-[#6c757d] px-1.5 text-sm text-white">
                    {team}
                </span>
            ))}
            {note.author && <span className="ml-2 text-sm text-[#6c757d]">({note.author.name})</span>}
            <button
                type="button"
                className="ml-2 text-sm text-[#dc3545] underline"
                onClick={(clickEvent) => {
                    clickEvent.stopPropagation();
                    onDelete(note);
                }}
            >
                Delete
            </button>
        </div>
    );
}

function NotesTab({ matches, onAddNote }: { matches: CompetitionMatch[]; onAddNote: (match: CompetitionMatch) => void }) {
    const api = useApi();
    const queryClient = useQueryClient();
    const [view, setView] = useState<'match' | 'team' | 'meeting'>('match');
    const { data: notes = [] } = useQuery({ queryKey: ['match-notes', apiScope()], queryFn: () => api.getMatchNotes(), refetchInterval: 10000 });
    const remove = useMutation({
        mutationFn: (note: MatchNote) => api.deleteMatchNote(note.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['match-notes'] }),
    });
    const onDelete = (note: MatchNote) => confirm('Delete this note?') && remove.mutate(note);
    const matchNames = new Map(matches.map((match) => [match.id, shortMatchName(match)]));
    const teams = [...new Set(matches.flatMap((match) => match.match_alliances.map((member) => String(member.team.number))))].sort(
        (a, b) => Number(a) - Number(b),
    );

    return (
        <>
            <div className="my-3 flex gap-2">
                <button type="button" className={view === 'match' ? bs.btnPrimary : bs.btnSecondary} onClick={() => setView('match')}>
                    By Match
                </button>
                <button type="button" className={view === 'team' ? bs.btnPrimary : bs.btnSecondary} onClick={() => setView('team')}>
                    By Team
                </button>
                <button type="button" className={view === 'meeting' ? bs.btnPrimary : bs.btnSecondary} onClick={() => setView('meeting')}>
                    Meeting
                </button>
            </div>
            {view === 'meeting' ? (
                <MeetingNotes />
            ) : view === 'match' ? (
                <>
                    <p className="mb-2">Tap on a row to add a note for that match.</p>
                    <table className={cn(bs.table, bs.tableStriped)}>
                        <thead>
                            <tr>
                                <th className="w-1/12 text-left">Match</th>
                                <th className="text-left">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((match) => (
                                <tr key={match.id} className="cursor-pointer" onClick={() => onAddNote(match)}>
                                    <td className="text-left">{shortMatchName(match)}</td>
                                    <td>
                                        {notes
                                            .filter((note) => note.match_id === match.id)
                                            .map((note) => (
                                                <NoteText key={note.id} note={note} onDelete={onDelete} />
                                            ))}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : (
                <table className={cn(bs.table, bs.tableStriped)}>
                    <thead>
                        <tr>
                            <th className="w-1/12 text-left">Team</th>
                            <th className="text-left">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team}>
                                <td className="text-left">{team}</td>
                                <td>
                                    {notes
                                        .filter((note) => note.teams?.includes(team))
                                        .map((note) => (
                                            <NoteText key={note.id} note={note} prefix={matchNames.get(note.match_id)} onDelete={onDelete} />
                                        ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </>
    );
}

function clock(at: number | null): string {
    return at === null ? '' : new Date(at).toLocaleTimeString('en-GB');
}

function duration(milliseconds: number): string {
    const seconds = Math.max(0, Math.round(milliseconds / 1000));

    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function TimersTab({ matches, next }: { matches: CompetitionMatch[]; next: CompetitionMatch | null }) {
    const [now, setNow] = useState(() => serverNow());
    const { warningStartedAt, setWarning } = useHeadRefereeDesk();
    const warningEndsAt = warningStartedAt === null ? null : warningStartedAt + TWO_MINUTES_MS;

    useEffect(() => {
        const id = setInterval(() => setNow(serverNow()), 500);

        return () => clearInterval(id);
    }, []);

    const running = matches.find((match) => match.status === 'ongoing');
    const upcoming = matches.filter((match) => match.status === 'upcoming').slice(0, 3);
    const rows: { match: string; type: string; start: number | null; length: number | null; end: number }[] = [];

    if (running?.started_at) {
        const start = new Date(running.started_at).getTime();
        const length = running.duration_ms ?? 0;
        rows.push({ match: '', type: `Running Match (${shortMatchName(running)})`, start, length, end: start + length });
    }

    for (const match of upcoming) {
        rows.push({ match: shortMatchName(match), type: 'Scheduled Time', start: null, length: null, end: new Date(match.start_time).getTime() });
    }

    if (warningEndsAt !== null) {
        rows.push({
            match: next ? shortMatchName(next) : '',
            type: '2-Minute Warning',
            start: warningEndsAt - TWO_MINUTES_MS,
            length: TWO_MINUTES_MS,
            end: warningEndsAt,
        });
    }

    const nextStart = next ? new Date(next.start_time).getTime() : null;

    return (
        <>
            {next && (
                <>
                    <h4 className={cn(bs.h4, 'mt-4 text-center')}>Timing - {shortMatchName(next)}</h4>
                    <p className="text-center">
                        {ALLIANCES.map((color) => (
                            <span key={color} className="mx-2 capitalize">
                                {color}:{' '}
                                {getAllianceMembers(next, color)
                                    .map((member) => member.team.number)
                                    .join(', ')}
                            </span>
                        ))}
                    </p>
                    <div className="my-3 flex flex-wrap items-center justify-center gap-6">
                        <span className="italic">
                            {warningEndsAt !== null
                                ? warningEndsAt > now
                                    ? `2-Minute Warning Active: ${duration(warningEndsAt - now)}`
                                    : '2-Minute Warning has ended!'
                                : nextStart !== null && nextStart > now
                                  ? `Match starts in ${duration(nextStart - now)}`
                                  : 'Match start time has passed!'}
                        </span>
                        <button
                            type="button"
                            className={bs.btnSuccess}
                            onClick={() => (warningEndsAt === null || confirm('Are you sure you want to restart the timer?')) && setWarning(true)}
                        >
                            {warningEndsAt === null ? 'Start 2-Minute Warning' : 'Restart 2-Minute Warning'}
                        </button>
                    </div>
                    <hr className="my-4" />
                </>
            )}
            <h4 className={cn(bs.h4, 'text-center')}>All Timing</h4>
            <p className="text-center">Current time: {clock(now)}</p>
            <table className="mt-2 text-center [&_td]:px-2 [&_td]:py-0.5 [&_th]:px-2">
                <thead>
                    <tr>
                        <th>M</th>
                        <th>Type</th>
                        <th>Start</th>
                        <th>Length</th>
                        <th>End</th>
                        <th>Left</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={`${row.match}-${row.type}`}>
                            <td>{row.match}</td>
                            <td className="text-left">{row.type}</td>
                            <td className="tabular-nums">{clock(row.start)}</td>
                            <td className="tabular-nums">{row.length === null ? '' : duration(row.length)}</td>
                            <td className="tabular-nums">{clock(row.end)}</td>
                            <td className={cn('tabular-nums', row.end <= now && 'bg-[#00ff00]')}>{duration(row.end - now)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
}

const TABS = [
    { value: 'active', label: 'Active Match' },
    { value: 'notes', label: 'Notes' },
    { value: 'timers', label: 'Timers' },
    { value: 'scoresheets', label: 'Scoresheets' },
] as const;

export default function HeadReferee() {
    const { value: allMatches = [] } = useProp<CompetitionMatch[]>('matches');
    const fieldCount = useFieldCount();
    const [field, setField] = useState<number | null>(() => {
        const requested = Number(new URLSearchParams(window.location.search).get('field'));

        return Number.isInteger(requested) && requested > 0 ? requested : null;
    });
    const matches = useMemo(() => (field === null ? allMatches : allMatches.filter((match) => match.field === field)), [allMatches, field]);
    const { settings } = useMatchControlSettings();
    const chooseField = (chosen: number | null) => {
        setField(chosen);
        window.history.replaceState(window.history.state, '', chosen === null ? window.location.pathname : `?field=${chosen}`);
    };
    const [tab, setTab] = useState<(typeof TABS)[number]['value']>('active');
    const [noteMatch, setNoteMatch] = useState<CompetitionMatch | null>(null);
    const running = matches.find((match) => match.status === 'ongoing');
    const { data: loadedMatch } = useLoadedMatch(5000);
    const waiting = loadedMatch?.status === 'upcoming' && (field === null || loadedMatch.field === field) ? loadedMatch : null;
    const lastPlayed = [...matches].reverse().find((match) => match.status === 'completed');
    const { data: liveMatch } = useMatch(running?.id ?? waiting?.id ?? lastPlayed?.id ?? null, 2000);
    const match = liveMatch ?? running ?? null;
    const firstUnplayed = matches.find((candidate) => candidate.status === 'upcoming') ?? null;
    const next = waiting ?? firstUnplayed;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Head Referee" />
            <div>
                <div className="text-center">
                    <button
                        type="button"
                        className="text-[#0d6efd] underline"
                        onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
                    >
                        Fullscreen
                    </button>
                </div>
                <h2 className={cn(bs.h2, 'text-center')}>Head Referee ({field === null ? 'All Fields' : `Field ${field}`})</h2>
                {fieldCount > 1 && (
                    <div className="mb-2 flex flex-wrap justify-center gap-2">
                        {[null, ...Array.from({ length: fieldCount }, (_, index) => index + 1)].map((option) => (
                            <button
                                key={option ?? 'all'}
                                type="button"
                                className={cn(bs.btnSm, option === field ? bs.btnPrimary : bs.btnSecondary)}
                                onClick={() => chooseField(option)}
                            >
                                {option === null ? 'All Fields' : `Field ${option}`}
                            </button>
                        ))}
                    </div>
                )}

                <ul className="flex flex-wrap border-b border-[#dee2e6]" role="tablist">
                    {TABS.map((option) => (
                        <li key={option.value}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === option.value}
                                onClick={() => setTab(option.value)}
                                className={cn(
                                    'block px-4 py-2',
                                    tab === option.value
                                        ? '-mb-px rounded-t-md border border-[#dee2e6] border-b-white bg-white text-black'
                                        : 'text-[#0d6efd] hover:text-[#0a58ca]',
                                )}
                            >
                                {option.label}
                            </button>
                        </li>
                    ))}
                </ul>

                {tab === 'active' && <MatchControls control={settings.hr_control} loaded={waiting} running={running ?? null} next={firstUnplayed} />}
                {tab === 'active' &&
                    (match ? (
                        <ActiveMatchTab match={match} matches={matches} onAddNote={setNoteMatch} />
                    ) : (
                        <div className={cn(bs.alertInfo, 'mt-4 text-center')}>No Active Match</div>
                    ))}
                {tab === 'notes' && <NotesTab matches={matches} onAddNote={setNoteMatch} />}
                {tab === 'timers' && <TimersTab matches={matches} next={next} />}
                {tab === 'scoresheets' && <ScoresheetsTab matches={matches} />}
                {noteMatch && <NoteDialog match={noteMatch} onClose={() => setNoteMatch(null)} />}
            </div>
        </AppLayout>
    );
}
