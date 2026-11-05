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
    { title: 'Cards', path: 'reports/cards', description: 'Every yellow and red card given so far, by team, for the head referee.' },
    { title: 'Announcer sheet', path: 'reports/announcer', description: 'Each match with team names, where they are from and their rank.' },
    { title: 'Team placards', path: 'reports/placards', description: 'One page per team with its number, in ranking order.' },
    {
        title: 'Team match lists',
        path: 'reports/team-schedules',
        description: 'Each team’s own matches, partners and opponents, to hand out at check-in.',
    },
    { title: 'Paper scoresheets', path: 'reports/scoresheets', description: 'Blank scoresheets built from the game, for when a tablet fails.' },
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
