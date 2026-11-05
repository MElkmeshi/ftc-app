import PrintLayout from '@/layouts/print-layout';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * A row per team with room to write, for inspection, judging or the field
 * technical advisor (FTC Live's tech notes and judging sheets).
 */
export default function NotesReport() {
    const { event, teams } = usePage<SharedData & { teams: Team[] }>().props;
    const [heading, setHeading] = useState('Team notes');

    return (
        <PrintLayout
            title="Notes sheet"
            toolbar={
                <label className="flex items-center gap-2 text-sm">
                    Heading
                    <input className="rounded border px-2 py-1" value={heading} onChange={(changeEvent) => setHeading(changeEvent.target.value)} />
                </label>
            }
        >
            <p className="text-sm text-gray-600">{event?.name}</p>
            <h2 className="mb-3 text-2xl font-bold">{heading}</h2>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="w-20 py-1">Team</th>
                        <th className="w-56 py-1">Name</th>
                        <th className="w-16 py-1 text-center">✓</th>
                        <th className="py-1">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((team) => (
                        <tr key={team.id} className="h-16 break-inside-avoid border-b align-top">
                            <td className="py-2 font-mono font-bold">{team.number}</td>
                            <td className="py-2">{team.name}</td>
                            <td className="py-2 text-center">
                                <span className="inline-block size-5 border border-gray-500" />
                            </td>
                            <td className="py-2" />
                        </tr>
                    ))}
                </tbody>
            </table>
        </PrintLayout>
    );
}
