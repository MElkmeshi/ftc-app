import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

const REPORTS: { title: string; path: string }[] = [
    { title: 'Announcer Reports', path: 'reports/announcer' },
    { title: 'Competing Teams Report', path: 'reports/team-list' },
    { title: 'Cycle Time Reports', path: 'reports/cycle' },
    { title: 'FTA Notes Form', path: 'reports/field-notes' },
    { title: 'HR Tracking Report', path: 'reports/notes' },
    { title: 'Match Observer Judge Sheets', path: 'reports/judge' },
    { title: 'Pit Map Report', path: 'pit-map' },
    { title: 'Practice Match Participation', path: 'reports/practice' },
    { title: 'Referee Card Report', path: 'reports/cards' },
    { title: 'Team Placards', path: 'reports/placards' },
];

export default function Reports() {
    const { event } = usePage<SharedData>().props;
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Reports', href: '/reports' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Reports" />

            <div className="pointer-events-none -mt-6">
                <h3 className={cn(bs.h3, 'mx-auto w-6/12 px-3 text-center')}>{event?.name} Reports</h3>
                <br />
                <ul className="pointer-events-auto mb-4 ml-[8.333%] list-disc pl-8">
                    {REPORTS.map((report) => (
                        <li key={report.path}>
                            <Link href={`/event/${event?.code}/${report.path}`} className={bs.link}>
                                {report.title}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </AppLayout>
    );
}
