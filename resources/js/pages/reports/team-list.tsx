import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

type Detail = 'organization' | 'city' | 'rookie_year';

const DETAILS: { value: Detail; toggle: string; label: string; centred: boolean }[] = [
    { value: 'organization', toggle: 'Show Affiliation', label: 'Affiliation', centred: false },
    { value: 'city', toggle: 'Show City', label: 'City', centred: false },
    { value: 'rookie_year', toggle: 'Show Rookie', label: 'Rookie Year', centred: true },
];

const LEFT_BORDER = 'border-l border-[#dee2e6]';

/**
 * Every team with the details the organiser picks (FTC Live's team list).
 */
export default function TeamListReport() {
    const { event, teams } = usePage<SharedData & { teams: Team[] }>().props;
    const [shown, setShown] = useState<Detail[]>([]);
    const [condensed, setCondensed] = useState(false);
    const columns = DETAILS.filter((detail) => shown.includes(detail.value));

    const toggle = (detail: Detail) => setShown(shown.includes(detail) ? shown.filter((value) => value !== detail) : [...shown, detail]);

    return (
        <PrintLayout
            title={`${event?.name ?? ''} Teams`}
            toolbar={
                <label className="pl-[5em]">
                    <input type="checkbox" checked={condensed} onChange={() => setCondensed(!condensed)} />
                    Condensed
                </label>
            }
        >
            <div className="print:hidden">
                {DETAILS.map((detail) => (
                    <label key={detail.value} className="block">
                        <input type="checkbox" checked={shown.includes(detail.value)} onChange={() => toggle(detail.value)} />
                        {detail.toggle}
                    </label>
                ))}
            </div>
            <ReportRow>
                <table className={cn(bs.table, bs.tableStriped, condensed && '[&_td]:px-[.25em] [&_td]:py-0 [&_th]:px-[.25em] [&_th]:py-0')}>
                    <thead>
                        <tr>
                            <th scope="col" className="text-center">
                                Number
                            </th>
                            <th scope="col" className={cn('text-center', LEFT_BORDER)}>
                                Team Number
                            </th>
                            <th scope="col" className={cn('text-center', LEFT_BORDER)}>
                                Name
                            </th>
                            {columns.map((column) => (
                                <th key={column.value} scope="col" className={cn('text-center', LEFT_BORDER)}>
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team, index) => (
                            <tr key={team.id}>
                                <td className="text-center">{index + 1}</td>
                                <td className={cn('text-center', LEFT_BORDER)}>{team.number}</td>
                                <td className={LEFT_BORDER}>{team.name}</td>
                                {columns.map((column) => (
                                    <td key={column.value} className={cn(LEFT_BORDER, column.centred && 'text-center')}>
                                        {team[column.value] ?? ''}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ReportRow>
        </PrintLayout>
    );
}
