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
