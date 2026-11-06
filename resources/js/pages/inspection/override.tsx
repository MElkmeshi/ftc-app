import { InspectionStatusBadge } from '@/components/inspection-status-badge';
import AppLayout from '@/layouts/app-layout';
import { INSPECTION_STATUSES, type InspectionStatus, passedShare, type TeamInspectionStatus } from '@/lib/inspection-utils';
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

            <h1 className="text-[2rem] leading-tight font-medium">Robot Inspection - {event?.name}</h1>

            <div className="flex flex-wrap items-center gap-2">
                <span>Legend:</span>
                {INSPECTION_STATUSES.map((status) => (
                    <InspectionStatusBadge key={status.value} status={status.value} />
                ))}
            </div>
            <p className="font-medium">{passedShare(teams)}% Passed</p>
            <p>Set the status of each team. This skips the checklist, so use it only when inspection was done another way.</p>

            <table className="w-full max-w-3xl">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="p-2">Team</th>
                        <th className="p-2">Name</th>
                        <th className="p-2">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((team) => (
                        <tr key={team.id} className="border-b">
                            <td className="p-2 font-bold tabular-nums">{team.number}</td>
                            <td className="p-2">{team.name}</td>
                            <td className="p-2">
                                <select
                                    aria-label={`Status of team ${team.number}`}
                                    className="border-input bg-background h-[38px] rounded-md border px-2"
                                    value={team.status}
                                    disabled={savingTeamId === team.id}
                                    onChange={(changeEvent) => setStatus(team, changeEvent.target.value as InspectionStatus)}
                                >
                                    {INSPECTION_STATUSES.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </AppLayout>
    );
}
