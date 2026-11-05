import PrintLayout from '@/layouts/print-layout';
import { cn } from '@/lib/utils';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

type Detail = 'organization' | 'city' | 'rookie_year';

const DETAILS: { value: Detail; label: string }[] = [
    { value: 'organization', label: 'School / organization' },
    { value: 'city', label: 'City' },
    { value: 'rookie_year', label: 'Rookie year' },
];

/**
 * Every team with the details the organiser picks (FTC Live's team list).
 */
export default function TeamListReport() {
    const { event, teams } = usePage<SharedData & { teams: Team[] }>().props;
    const [shown, setShown] = useState<Detail[]>(['organization', 'city']);
    const [condensed, setCondensed] = useState(false);
    const columns = DETAILS.filter((detail) => shown.includes(detail.value));

    const toggle = (detail: Detail) => setShown(shown.includes(detail) ? shown.filter((value) => value !== detail) : [...shown, detail]);

    return (
        <PrintLayout
            title="Team list"
            toolbar={
                <div className="flex flex-wrap gap-3 text-sm">
                    {DETAILS.map((detail) => (
                        <label key={detail.value} className="flex items-center gap-1">
                            <input type="checkbox" checked={shown.includes(detail.value)} onChange={() => toggle(detail.value)} /> {detail.label}
                        </label>
                    ))}
                    <label className="flex items-center gap-1">
                        <input type="checkbox" checked={condensed} onChange={() => setCondensed(!condensed)} /> Condensed
                    </label>
                </div>
            }
        >
            <p className="text-sm text-gray-600">{event?.name}</p>
            <h2 className="mb-3 text-2xl font-bold">Teams ({teams.length})</h2>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="w-24 py-1">Number</th>
                        <th className="py-1">Name</th>
                        {columns.map((column) => (
                            <th key={column.value} className="py-1">
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {teams.map((team) => (
                        <tr key={team.id} className="border-b">
                            <td className={cn('font-mono font-bold', condensed ? 'py-0.5' : 'py-2')}>{team.number}</td>
                            <td className={condensed ? 'py-0.5' : 'py-2'}>{team.name}</td>
                            {columns.map((column) => (
                                <td key={column.value} className={condensed ? 'py-0.5' : 'py-2'}>
                                    {team[column.value] ?? ''}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </PrintLayout>
    );
}
