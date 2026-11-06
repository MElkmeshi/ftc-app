import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface ReportLink {
    title: string;
    path: string;
    description: string;
}

const REPORTS: ReportLink[] = [
    { title: 'Cycle times', path: 'reports/cycle', description: 'Time between match starts and how far the event is from its schedule.' },
    { title: 'Practice participation', path: 'reports/practice', description: 'Practice matches each team has played and still has to play.' },
    { title: 'Robot inspection notes', path: 'inspection/notes', description: 'Every team’s inspection status and the inspector’s notes.' },
    { title: 'Cards', path: 'reports/cards', description: 'Every yellow and red card given so far, by team, for the head referee.' },
    { title: 'Announcer sheet', path: 'reports/announcer', description: 'Each match with team names, where they are from and their rank.' },
    { title: 'Team placards', path: 'reports/placards', description: 'One page per team with its number, in ranking order.' },
    {
        title: 'Team match lists',
        path: 'reports/team-schedules',
        description: 'Each team’s own matches, partners and opponents, to hand out at check-in.',
    },
    { title: 'Paper scoresheets', path: 'reports/scoresheets', description: 'Blank scoresheets built from the game, for when a tablet fails.' },
    {
        title: 'Judge observer sheets',
        path: 'reports/judge',
        description: 'A sheet per team with its qualification matches, for judges watching play.',
    },
    { title: 'Team list', path: 'reports/team-list', description: 'Every team, with the details you choose to show.' },
    { title: 'Field notes', path: 'reports/field-notes', description: 'Every match with its teams and room to note robot or field problems.' },
    { title: 'Notes sheet', path: 'reports/notes', description: 'A row per team for judges, inspectors or field staff to write on.' },
];

/**
 * Every report for the event, like FTC Live's Reports page.
 */
export default function Reports() {
    const { event } = usePage<SharedData>().props;
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <h1 className="text-center text-[2rem] leading-tight font-medium">{event?.name} Reports</h1>
            <ul className="list-disc pl-[6.5rem] max-sm:pl-8">
                {[...REPORTS]
                    .sort((first, second) => first.title.localeCompare(second.title))
                    .map((report) => (
                        <li key={report.path} className="my-1">
                            <Link href={`/event/${event?.code}/${report.path}`} title={report.description} className="text-[#0d6efd] underline">
                                {report.title}
                            </Link>
                        </li>
                    ))}
            </ul>
        </AppLayout>
    );
}
