import PublicLayout from '@/layouts/public-layout';
import { type EventTypeOption, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { BarChart3, ClipboardCheck, ListOrdered, Monitor, MonitorPlay, Swords, Trophy, UserCheck, Users } from 'lucide-react';
import { type ComponentType, type ReactNode } from 'react';

interface EventShowProps extends SharedData {
    summary: { teams: number; matches: number; completed_matches: number };
    eventTypes: EventTypeOption[];
}

interface LinkEntry {
    label: string;
    href: string;
    description?: string;
}

function LinkSection({ title, icon: Icon, children }: { title: string; icon: ComponentType<{ className?: string }>; children: ReactNode }) {
    return (
        <section className="bg-card rounded-xl border p-5 shadow-sm">
            <h2 className="mb-3 inline-flex items-center gap-2 font-semibold">
                <Icon className="text-primary size-5" /> {title}
            </h2>
            {children}
        </section>
    );
}

function LinkList({ links }: { links: LinkEntry[] }) {
    return (
        <ul className="space-y-1.5">
            {links.map((link) => (
                <li key={link.href}>
                    <Link href={link.href} className="text-primary font-medium hover:underline">
                        {link.label}
                    </Link>
                    {link.description && <span className="text-muted-foreground text-sm"> — {link.description}</span>}
                </li>
            ))}
        </ul>
    );
}

/**
 * An event's public landing page, modelled on FTC Live's event home: one place
 * to find every schedule, ranking, display and tablet page for the event.
 */
export default function EventShow() {
    const { event, summary, eventTypes } = usePage<EventShowProps>().props;

    if (!event) {
        return null;
    }

    const base = `/event/${event.code}`;
    const typeLabel = eventTypes.find((type) => type.value === event.type)?.label ?? event.type;

    return (
        <PublicLayout>
            <Head title={event.name} />

            <div className="mb-6">
                <div className="text-muted-foreground font-mono text-sm">{event.code}</div>
                <h1 className="text-3xl font-bold">{event.name}</h1>
                <p className="text-muted-foreground">
                    {typeLabel}
                    {event.venue && ` · ${event.venue}`}
                    {event.start_date && ` · ${event.start_date}`}
                    {event.end_date && event.end_date !== event.start_date && ` → ${event.end_date}`}
                </p>
                <div className="mt-3 flex flex-wrap gap-3 text-sm">
                    <span className="bg-muted rounded-full px-3 py-1">{summary.teams} teams</span>
                    <span className="bg-muted rounded-full px-3 py-1">
                        {summary.completed_matches} / {summary.matches} matches played
                    </span>
                    <span className="bg-muted rounded-full px-3 py-1">
                        {event.field_count} field{event.field_count === 1 ? '' : 's'}
                    </span>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <LinkSection title="Event Info" icon={ListOrdered}>
                    <LinkList
                        links={[
                            { label: 'Schedule & results', href: `${base}/competition-matches` },
                            { label: 'Rankings', href: `${base}/referee/display` },
                            { label: 'Elimination bracket', href: `${base}/elimination/bracket` },
                        ]}
                    />
                </LinkSection>

                <LinkSection title="Displays" icon={Monitor}>
                    <LinkList
                        links={[
                            {
                                label: 'Audience display',
                                href: `${base}/display`,
                                description: 'follows match control: preview, timer, results, rankings',
                            },
                            { label: 'Pit display', href: `${base}/display/pit`, description: 'scrolling rankings and upcoming matches' },
                            { label: 'Match overlay', href: `${base}/display/match-overlay`, description: 'timer and live score for streams' },
                            { label: 'Rankings display', href: `${base}/referee/display` },
                            { label: 'Alliance selection display', href: `${base}/alliance-selection/display` },
                            { label: 'Bracket display', href: `${base}/elimination/bracket` },
                        ]}
                    />
                </LinkSection>

                <LinkSection title="Referees" icon={UserCheck}>
                    <LinkList links={[{ label: 'Referee scoring', href: `${base}/referee/scoring`, description: 'sign-in required' }]} />
                </LinkSection>

                <LinkSection title="Event Admin" icon={ClipboardCheck}>
                    <LinkList
                        links={[
                            { label: 'Event dashboard', href: `${base}/dashboard`, description: 'setup checklist' },
                            { label: 'Match control', href: `${base}/match-control`, description: 'load, start, post results' },
                            { label: 'Teams', href: `${base}/admin/teams` },
                        ]}
                    />
                </LinkSection>

                <LinkSection title="Alliance Selection" icon={Users}>
                    <LinkList
                        links={[
                            { label: 'Run alliance selection', href: `${base}/admin/alliance-selection` },
                            { label: 'Audience view', href: `${base}/alliance-selection/display` },
                        ]}
                    />
                </LinkSection>

                <LinkSection title="Playoffs" icon={Swords}>
                    <LinkList
                        links={[
                            { label: 'Bracket', href: `${base}/elimination/bracket` },
                            { label: 'Results', href: `${base}/competition-matches` },
                        ]}
                    />
                </LinkSection>
            </div>

            <p className="text-muted-foreground mt-8 flex items-center gap-2 text-sm">
                <Trophy className="size-4" /> <BarChart3 className="size-4" /> <MonitorPlay className="size-4" />
                Open any display on a screen at the venue and it updates live — no refreshing needed.
            </p>
        </PublicLayout>
    );
}
