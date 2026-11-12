import { inspectionStatusCellClass, inspectionStatusLabel, InspectionStatusLegend } from '@/components/inspection-status-badge';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { INSPECTION_STATUSES, type InspectionStatus, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, usePage, useProp } from '@inertiajs/react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Team Select', href: '/inspection' },
    { title: 'Override', href: '/inspection/override' },
];

export default function InspectionOverride() {
    const { event } = usePage<SharedData>().props;
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('teams');
    const [savingTeamId, setSavingTeamId] = useState<number | null>(null);

    const setStatus = (team: TeamInspectionStatus, status: InspectionStatus) => {
        setSavingTeamId(team.id);
        router.put(`/event/${event?.code}/inspection/${team.id}/status`, { status }, { preserveScroll: true, onFinish: () => setSavingTeamId(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inspection Override" />

            <div>
                <h3 className={bs.h3}>Robot Inspection - {event?.name}</h3>
                <br />
                <InspectionStatusLegend teams={teams} />
                <div>Set the status of each team:</div>
                <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Name</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.id}>
                                <td>{team.number}</td>
                                <td>{team.name}</td>
                                <td className={inspectionStatusCellClass(team.status)}>
                                    <select
                                        aria-label={`Status of team ${team.number}`}
                                        className="rounded-sm border border-black bg-white text-black"
                                        value={team.status}
                                        disabled={savingTeamId === team.id}
                                        onChange={(changeEvent) => setStatus(team, changeEvent.target.value as InspectionStatus)}
                                    >
                                        {INSPECTION_STATUSES.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {inspectionStatusLabel(status.value)}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
