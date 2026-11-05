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

            <div className="space-y-4 p-4">
                <h1 className="text-2xl font-bold">Reports</h1>
                <ul className="divide-y rounded-lg border">
                    {REPORTS.map((report) => (
                        <li key={report.path}>
                            <Link href={`/event/${event?.code}/${report.path}`} className="hover:bg-accent block px-4 py-3">
                                <div className="text-primary font-medium">{report.title}</div>
                                <div className="text-muted-foreground text-sm">{report.description}</div>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </AppLayout>
    );
}
