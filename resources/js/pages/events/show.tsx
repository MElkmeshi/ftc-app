import PublicLayout from '@/layouts/public-layout';
import { type EventTypeOption, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

interface EventShowProps extends SharedData {
    summary: { teams: number; matches: number; completed_matches: number };
    eventTypes: EventTypeOption[];
}

interface MenuEntry {
    label: string;
    href?: string;
    children?: MenuEntry[];
}

function MenuList({ entries }: { entries: MenuEntry[] }) {
    return (
        <ul className="list-disc pl-[7.5rem] max-sm:pl-10 [&_ul]:list-[circle] [&_ul]:pl-8">
            {entries.map((entry) => (
                <li key={entry.label} className="my-4">
                    {entry.href ? (
                        <Link href={entry.href} className="text-[#0d6efd] underline">
                            {entry.label}
                        </Link>
                    ) : (
                        entry.label
                    )}
                    {entry.children && <MenuList entries={entry.children} />}
                </li>
            ))}
        </ul>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h3 className="mt-1 text-[1.75rem] leading-tight font-medium">{title}</h3>
            {children}
        </section>
    );
}

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

            <div>
                <h2 className="text-[2rem] leading-tight font-medium">
                    {event.code}: {event.name}
                </h2>
                <p className="text-muted-foreground mt-1">
                    {typeLabel}
                    {event.venue && ` · ${event.venue}`}
                    {event.start_date && ` · ${event.start_date}`}
                    {event.end_date && event.end_date !== event.start_date && ` – ${event.end_date}`}
                    {` · ${summary.teams} teams · ${summary.completed_matches} of ${summary.matches} matches played`}
                </p>
            </div>

            <Section title="Event Info">
                <MenuList
                    entries={[
                        { label: 'Inspection Status', href: `${base}/inspection/status` },
                        { label: 'Practice', children: [{ label: 'Schedule', href: `${base}/schedule` }] },
                        {
                            label: 'Qualification',
                            children: [
                                { label: 'Schedule', href: `${base}/schedule` },
                                { label: 'Rankings', href: `${base}/rankings` },
                            ],
                        },
                        { label: 'Playoff', children: [{ label: 'Bracket', href: `${base}/elimination/bracket` }] },
                        { label: 'Match Results', href: `${base}/schedule` },
                        { label: 'Pit Display', href: `${base}/display?type=pit` },
                        { label: 'Pit Map', href: `${base}/pit-map` },
                        { label: 'Event Reports', href: `${base}/reports` },
                    ]}
                />
            </Section>

            <Section title="Inspection">
                <MenuList entries={[{ label: 'Robot Inspection', href: `${base}/inspection` }]} />
            </Section>

            <Section title="Referee">
                <MenuList entries={[{ label: 'Referee Scoring', href: `${base}/referee/scoring` }]} />
            </Section>

            <Section title="FTA/CSA Tools">
                <MenuList entries={[{ label: 'Field Notes', href: `${base}/reports/field-notes` }]} />
            </Section>

            <Section title="Displays">
                <MenuList
                    entries={[
                        { label: 'Scoring/Timing Displays', href: `${base}/display` },
                        { label: 'Pit Display', href: `${base}/display?type=pit` },
                        { label: 'Rankings Display', href: `${base}/referee/display` },
                        { label: 'Alliance Selection Display', href: `${base}/alliance-selection/display` },
                    ]}
                />
            </Section>

            <Section title="Judging">
                <MenuList entries={[{ label: 'Manage Awards', href: `${base}/admin/awards` }]} />
            </Section>

            <Section title="GA/Emcee">
                <MenuList
                    entries={[
                        { label: 'Opening Ceremony Script', href: `${base}/scripts?tab=opening` },
                        { label: 'Announcer Report', href: `${base}/reports/announcer` },
                        { label: 'Alliance Selection', href: `${base}/scripts?tab=selection` },
                        { label: 'Closing Ceremony Script', href: `${base}/scripts?tab=closing` },
                    ]}
                />
            </Section>

            <Section title="Event Administration">
                <MenuList
                    entries={[
                        { label: 'Event Dashboard', href: `${base}/dashboard` },
                        { label: 'Match Control Page', href: `${base}/match-control` },
                        { label: 'Connect Devices', href: `${base}/connect` },
                    ]}
                />
            </Section>
        </PublicLayout>
    );
}
