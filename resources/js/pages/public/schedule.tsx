import { TeamCardBadge } from '@/components/team-card-badge';
import { useChangedAt } from '@/hooks/use-changed-at';
import EventPageLayout from '@/layouts/event-page-layout';
import { formatMatchTime, getAllianceColorClasses, getAllianceMembers, getAllianceScore, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { Head, Link, usePage, useProp } from '@inertiajs/react';
import { useMemo, useState } from 'react';

function readStoredTeam(key: string): string {
    try {
        return window.localStorage.getItem(key) ?? '';
    } catch {
        return '';
    }
}

function storeTeam(key: string, team: string): void {
    try {
        if (team) {
            window.localStorage.setItem(key, team);
        } else {
            window.localStorage.removeItem(key);
        }
    } catch {
        return;
    }
}

function MatchOutcome({ match, colors }: { match: CompetitionMatch; colors: string[] }) {
    if (match.status === 'ongoing') {
        return <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">On field</span>;
    }

    if (match.status === 'cancelled') {
        return <span className="text-muted-foreground text-xs">Cancelled</span>;
    }

    if (match.status !== 'completed') {
        return <span className="text-muted-foreground text-sm">vs</span>;
    }

    const totals = colors.map((color) => getAllianceScore(match, color));
    const best = Math.max(...totals);
    const tied = totals.filter((total) => total === best).length > 1;

    return (
        <span className="text-lg font-bold tabular-nums">
            {colors.map((color, index) => (
                <span key={color}>
                    {index > 0 && <span className="text-muted-foreground px-1">–</span>}
                    <span className={cn(getAllianceColorClasses(color).text, !tied && totals.at(index) !== best && 'opacity-50')}>
                        {totals.at(index)}
                    </span>
                </span>
            ))}
        </span>
    );
}

function TeamCell({ match, color, slot, highlight }: { match: CompetitionMatch; color: string; slot: number; highlight: string }) {
    const member = getAllianceMembers(match, color)[slot];

    if (!member) {
        return <td className="p-2" />;
    }

    return (
        <td className="p-2 text-center tabular-nums">
            <span className={cn(member.team?.number === highlight && 'rounded bg-yellow-200 px-1 font-bold text-slate-900')}>
                {member.team?.number}
            </span>
            <TeamCardBadge card={member.card} className="ml-1" />
        </td>
    );
}

function ScheduleTable({ matches, highlight, base }: { matches: CompetitionMatch[]; highlight: string; base: string }) {
    const { event } = usePage<SharedData>().props;
    const colors = allianceColorsOf(matches[0]);
    const slots = Array.from(
        { length: Math.max(1, ...matches.map((match) => getAllianceMembers(match, colors[0] ?? 'red').length)) },
        (_, index) => index,
    );
    const showField = (event?.field_count ?? 1) > 1;
    const showScore = matches.some((match) => match.status !== 'upcoming');

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-center">
                <thead>
                    <tr className="border-b-2 border-black/80">
                        <th className="p-2">Start</th>
                        <th className="p-2">Match</th>
                        {showField && <th className="p-2">Field</th>}
                        {colors.flatMap((color) =>
                            slots.map((slot) => (
                                <th key={`${color}-${slot}`} className="p-2 capitalize">
                                    {color} {slot + 1}
                                </th>
                            )),
                        )}
                        {showScore && <th className="p-2">Score</th>}
                    </tr>
                </thead>
                <tbody>
                    {matches.map((match) => (
                        <tr key={match.id} className="border-b odd:bg-black/[0.05] dark:odd:bg-white/[0.05]">
                            <td className="p-2 whitespace-nowrap tabular-nums">{formatMatchTime(match.start_time, event?.timezone)}</td>
                            <td className="p-2 whitespace-nowrap">
                                <Link href={`${base}/matches/${match.id}`} className="text-[#0d6efd] underline">
                                    {getMatchTitle(match)}
                                </Link>
                            </td>
                            {showField && <td className="p-2">{getFieldLabel(match, event?.field_count ?? 1)?.replace(/^Field /, '')}</td>}
                            {colors.flatMap((color) =>
                                slots.map((slot) => (
                                    <TeamCell key={`${color}-${slot}`} match={match} color={color} slot={slot} highlight={highlight} />
                                )),
                            )}
                            {showScore && (
                                <td className="p-2 whitespace-nowrap">
                                    <MatchOutcome match={match} colors={allianceColorsOf(match)} />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * The match schedule and results for phones at the venue (FTC Live's
 * Schedule and Match Results pages). Picking a team keeps its matches in view
 * and is remembered on this device.
 */
export default function PublicSchedule() {
    const { event } = usePage<SharedData>().props;
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const updatedAt = useChangedAt(matches);
    const storageKey = `schedule-team:${event?.code}`;
    const [team, setTeam] = useState(() => readStoredTeam(storageKey));

    const teamNumbers = useMemo(
        () =>
            [
                ...new Set(
                    matches.flatMap((match) => match.match_alliances.map((matchAlliance) => matchAlliance.team?.number)).filter(Boolean) as string[],
                ),
            ].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
        [matches],
    );

    const visible = team ? matches.filter((match) => match.match_alliances.some((matchAlliance) => matchAlliance.team?.number === team)) : matches;
    const sections = [
        { title: 'Practice', matches: visible.filter((match) => match.type === 'practice') },
        { title: 'Qualifications', matches: visible.filter((match) => match.type === 'qualification') },
        { title: 'Playoffs', matches: visible.filter((match) => match.type === 'elimination') },
    ].filter((section) => section.matches.length > 0);
    const base = `/event/${event?.code}`;

    return (
        <EventPageLayout title="Match Schedule" updatedAt={updatedAt}>
            <Head title="Schedule" />

            <label className="mb-4 flex items-center gap-2 text-sm print:hidden">
                <span>My team</span>
                <select
                    className="bg-background rounded-md border px-2 py-1.5"
                    value={team}
                    onChange={(changeEvent) => {
                        setTeam(changeEvent.target.value);
                        storeTeam(storageKey, changeEvent.target.value);
                    }}
                >
                    <option value="">All teams</option>
                    {teamNumbers.map((number) => (
                        <option key={number} value={number}>
                            {number}
                        </option>
                    ))}
                </select>
            </label>

            {sections.length === 0 && <p className="text-muted-foreground py-12 text-center">The schedule has not been created yet.</p>}

            {sections.map((section) => (
                <section key={section.title} className="mb-6 break-inside-avoid">
                    <h2 className="mb-2 text-center text-[1.75rem] leading-tight font-medium">{section.title}</h2>
                    <ScheduleTable matches={section.matches} highlight={team} base={base} />
                </section>
            ))}
        </EventPageLayout>
    );
}
