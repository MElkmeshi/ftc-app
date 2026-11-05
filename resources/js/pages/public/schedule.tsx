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

function AllianceTeams({ match, color, highlight, align }: { match: CompetitionMatch; color: string; highlight: string; align: 'left' | 'right' }) {
    return (
        <div className={cn('flex flex-col gap-0.5', align === 'right' && 'items-end')}>
            {getAllianceMembers(match, color).map((matchAlliance) => (
                <span
                    key={matchAlliance.id}
                    className={cn(
                        'font-mono text-sm',
                        getAllianceColorClasses(color).text,
                        matchAlliance.team?.number === highlight && 'rounded bg-yellow-200 px-1 font-bold text-slate-900',
                    )}
                >
                    {matchAlliance.team?.number}
                </span>
            ))}
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
        { title: 'Qualifications', matches: visible.filter((match) => match.type === 'qualification') },
        { title: 'Playoffs', matches: visible.filter((match) => match.type === 'elimination') },
    ].filter((section) => section.matches.length > 0);
    const base = `/event/${event?.code}`;

    return (
        <EventPageLayout title="Schedule & results" updatedAt={updatedAt}>
            <Head title="Schedule" />

            <label className="mb-4 flex items-center gap-2 text-sm print:hidden">
                <span className="text-muted-foreground">My team</span>
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
                <section key={section.title} className="mb-6">
                    <h2 className="text-muted-foreground mb-2 text-sm font-semibold tracking-wide uppercase">{section.title}</h2>
                    <ul className="divide-y rounded-lg border">
                        {section.matches.map((match) => {
                            const colors = allianceColorsOf(match);
                            const field = getFieldLabel(match, event?.field_count ?? 1);

                            return (
                                <li key={match.id} className="break-inside-avoid">
                                    <Link
                                        href={`${base}/matches/${match.id}`}
                                        className="hover:bg-accent grid grid-cols-[7rem_1fr_auto_1fr] items-center gap-3 px-3 py-2"
                                    >
                                        <div>
                                            <div className="text-sm font-medium">{getMatchTitle(match)}</div>
                                            <div className="text-muted-foreground text-xs tabular-nums">
                                                {[formatMatchTime(match.start_time, event?.timezone), field].filter(Boolean).join(' · ')}
                                            </div>
                                        </div>
                                        {colors.at(0) && <AllianceTeams match={match} color={colors.at(0) ?? ''} highlight={team} align="right" />}
                                        <div className="min-w-16 text-center">
                                            <MatchOutcome match={match} colors={colors} />
                                        </div>
                                        {colors.at(1) && <AllianceTeams match={match} color={colors.at(1) ?? ''} highlight={team} align="left" />}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </EventPageLayout>
    );
}
