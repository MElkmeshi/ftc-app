import { inspectionStatusCellClass, inspectionStatusLabel } from '@/components/inspection-status-badge';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { type InspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface TeamNotes {
    id: number;
    number: number | string;
    name: string | null;
    status: InspectionStatus;
    notes: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Team Select', href: '/inspection' },
    { title: 'Notes', href: '/inspection/notes' },
];

export default function InspectionNotes() {
    const { event, teams } = usePage<SharedData & { teams: TeamNotes[] }>().props;
    const [condensed, setCondensed] = useState(false);
    const visible = condensed ? teams.filter((team) => team.notes) : teams;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Robot Inspection Notes" />

            <div>
                <div className="-mx-3 flex flex-wrap justify-center print:mx-0">
                    <div className="w-1/4 px-3 print:hidden">
                        <label>
                            <input type="checkbox" checked={condensed} onChange={(changeEvent) => setCondensed(changeEvent.target.checked)} />
                            Condensed
                        </label>
                    </div>
                    <h2 className={cn(bs.h2, 'w-1/2 px-3 text-center')}>Robot Inspection Notes - {event?.name}</h2>
                    <div className="w-1/6 px-3 print:hidden">&nbsp;</div>
                </div>
                <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                    <tbody>
                        <tr>
                            <th>Team</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Notes</th>
                        </tr>
                        {visible.map((team) => (
                            <tr key={team.id} className="break-inside-avoid">
                                <td className="w-1/12">{team.number}</td>
                                <td className="w-1/3">{team.name}</td>
                                <td className={cn('w-1/12', inspectionStatusCellClass(team.status))}>{inspectionStatusLabel(team.status)}</td>
                                <td className="w-1/2 whitespace-pre-line">{team.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
