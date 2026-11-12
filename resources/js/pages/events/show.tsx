import PublicLayout from '@/layouts/public-layout';
import { type Ability, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

type EventShowProps = SharedData;

interface MenuEntry {
    label: string;
    href?: string;
    ability?: Ability;
    children?: MenuEntry[];
}

function eventSections(base: string): { title: string; entries: MenuEntry[] }[] {
    return [
        {
            title: 'Event Info',
            entries: [
                { label: 'Judging & Inspection Status', href: `${base}/inspection/status` },
                { label: 'Practice', children: [{ label: 'Schedule', href: `${base}/schedule?view=practice` }] },
                {
                    label: 'Qualification',
                    children: [
                        { label: 'Schedule', href: `${base}/schedule?view=qualification` },
                        { label: 'Rankings', href: `${base}/rankings` },
                    ],
                },
                {
                    label: 'Playoff',
                    children: [
                        { label: 'Schedule', href: `${base}/schedule?view=playoff` },
                        { label: 'Bracket', href: `${base}/elimination/bracket` },
                    ],
                },
                { label: 'Match Results', href: `${base}/schedule?view=results` },
                { label: 'Pit Display', href: `${base}/display?type=pit` },
                { label: 'Event Reports', href: `${base}/reports` },
            ],
        },
        { title: 'Inspection', entries: [{ label: 'Robot Inspection', href: `${base}/inspection`, ability: 'inspectRobots' }] },
        {
            title: 'Official Scorer',
            entries: [
                { label: 'Red Alliance Wall Scorer', href: `${base}/referee/scoring?alliance=red&role=scoring`, ability: 'scoreMatches' },
                { label: 'Blue Alliance Wall Scorer', href: `${base}/referee/scoring?alliance=blue&role=scoring`, ability: 'scoreMatches' },
            ],
        },
        {
            title: 'Referee',
            entries: [
                { label: 'Red Alliance Referee', href: `${base}/referee/scoring?alliance=red&role=penalty`, ability: 'scoreMatches' },
                { label: 'Blue Alliance Referee', href: `${base}/referee/scoring?alliance=blue&role=penalty`, ability: 'scoreMatches' },
                { label: 'Head Referee', href: `${base}/head-referee`, ability: 'controlMatches' },
            ],
        },
        { title: 'FTA/CSA Tools', entries: [{ label: 'FTA Notepad', href: `${base}/reports/field-notes`, ability: 'useFtaTools' }] },
        {
            title: 'Displays',
            entries: [
                { label: 'Scoring/Timing Displays', href: `${base}/display` },
                { label: 'Pit Display', href: `${base}/display?type=pit` },
            ],
        },
        { title: 'Judging', entries: [{ label: 'Manage Awards', href: `${base}/admin/awards`, ability: 'manageAwards' }] },
        {
            title: 'GA/Emcee',
            entries: [
                { label: 'Opening Ceremony Script', href: `${base}/scripts?tab=opening`, ability: 'viewScripts' },
                { label: 'Announcer Reports', href: `${base}/reports/announcer`, ability: 'viewScripts' },
                { label: 'Alliance Selection', href: `${base}/scripts?tab=selection`, ability: 'viewScripts' },
                { label: 'Closing Ceremony Script', href: `${base}/scripts?tab=closing`, ability: 'viewScripts' },
            ],
        },
        {
            title: 'Event Administration',
            entries: [
                { label: 'Event Dashboard', href: `${base}/dashboard`, ability: 'manageCompetition' },
                { label: 'Match Control Page', href: `${base}/match-control`, ability: 'controlMatches' },
            ],
        },
    ];
}

function allowedEntries(entries: MenuEntry[], can: Partial<Record<Ability, boolean>>): MenuEntry[] {
    return entries
        .filter((entry) => !entry.ability || can[entry.ability])
        .map((entry) => (entry.children ? { ...entry, children: allowedEntries(entry.children, can) } : entry))
        .filter((entry) => entry.href || (entry.children?.length ?? 0) > 0);
}

export function visibleSections(base: string, can: Partial<Record<Ability, boolean>> = {}): { title: string; entries: MenuEntry[] }[] {
    return eventSections(base)
        .map((section) => ({ ...section, entries: allowedEntries(section.entries, can) }))
        .filter((section) => section.entries.length > 0);
}

function MenuList({ entries, nested = false }: { entries: MenuEntry[]; nested?: boolean }) {
    return (
        <ul className={nested ? 'list-[circle] pl-8' : 'mb-4 ml-[calc(8.333%-10px)] list-disc px-3'}>
            {entries.map((entry) => (
                <li key={entry.label} className="px-4 py-2">
                    {entry.href ? (
                        <Link href={entry.href} className="text-[#0d6efd] underline">
                            {entry.label}
                        </Link>
                    ) : (
                        entry.label
                    )}
                    {entry.children && <MenuList entries={entry.children} nested />}
                </li>
            ))}
        </ul>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section>
            <h4 className="mb-2 text-2xl leading-[1.2] font-medium">{title}</h4>
            {children}
        </section>
    );
}

export default function EventShow() {
    const { event, auth } = usePage<EventShowProps>().props;

    if (!event) {
        return null;
    }

    const base = `/event/${event.code}`;

    return (
        <PublicLayout>
            <Head title={event.name} />

            <div>
                <h3 className="mb-2 text-[1.75rem] leading-[1.2] font-medium">
                    {event.code}: {event.name}
                </h3>
                <br />
                {visibleSections(base, auth.can).map((section) => (
                    <Section key={section.title} title={section.title}>
                        <MenuList entries={section.entries} />
                    </Section>
                ))}
            </div>
        </PublicLayout>
    );
}
