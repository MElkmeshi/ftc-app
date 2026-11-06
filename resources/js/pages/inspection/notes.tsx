import PrintLayout from '@/layouts/print-layout';
import { type InspectionStatus, inspectionStatusOf } from '@/lib/inspection-utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface TeamNotes {
    id: number;
    number: number | string;
    name: string | null;
    status: InspectionStatus;
    notes: string | null;
}

export default function InspectionNotes() {
    const { event, teams } = usePage<SharedData & { teams: TeamNotes[] }>().props;
    const [condensed, setCondensed] = useState(false);
    const visible = condensed ? teams.filter((team) => team.notes) : teams;

    return (
        <PrintLayout title="Robot Inspection Notes">
            <label className="mb-3 flex items-center gap-2 print:hidden">
                <input type="checkbox" checked={condensed} onChange={(changeEvent) => setCondensed(changeEvent.target.checked)} />
                Condensed (only teams with notes)
            </label>
            <h2 className="mb-3 text-2xl font-bold">Robot Inspection Notes - {event?.name}</h2>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="w-20 py-1">Team</th>
                        <th className="w-56 py-1">Name</th>
                        <th className="w-28 py-1">Status</th>
                        <th className="py-1">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {visible.map((team) => (
                        <tr key={team.id} className="break-inside-avoid border-b align-top">
                            <td className="py-2 font-bold tabular-nums">{team.number}</td>
                            <td className="py-2">{team.name}</td>
                            <td className="py-2">{inspectionStatusOf(team.status).label}</td>
                            <td className="py-2 whitespace-pre-line">{team.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </PrintLayout>
    );
}
