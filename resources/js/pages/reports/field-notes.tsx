import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Reports', href: '/reports' },
    { title: 'FTA Notes', href: '/reports/field-notes' },
];

function shortMatchName(match: CompetitionMatch): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    return match.type === 'qualification' ? `Q${match.number}` : getMatchTitle(match);
}

function allianceColumns(matches: CompetitionMatch[]): { color: string; seat: number }[] {
    const sizes = new Map<string, number>();

    for (const match of matches) {
        for (const color of allianceColorsOf(match)) {
            sizes.set(color, Math.max(sizes.get(color) ?? 0, membersOf(match, color).length));
        }
    }

    return [...sizes.entries()]
        .sort(([first], [second]) => (first === 'red' ? -1 : second === 'red' ? 1 : first.localeCompare(second)))
        .flatMap(([color, size]) => Array.from({ length: size }, (_, seat) => ({ color, seat })));
}

export default function FieldNotesReport() {
    const { event, matches } = usePage<SharedData & { matches: CompetitionMatch[] }>().props;
    const columns = allianceColumns(matches);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="FTA Notes" />

            <div>
                <br />
                <div className="-mx-3 flex flex-wrap justify-center print:mx-0">
                    <div className="w-1/4 print:hidden" />
                    <h2 className={cn(bs.h2, 'w-1/2 px-3 text-center print:w-full')}>{event?.name} FTA Notes</h2>
                    <div className="w-1/6 px-3 print:hidden">&nbsp;</div>
                    <button type="button" title="Print" onClick={() => window.print()} className={cn(bs.btnLight, 'w-1/12 print:hidden')}>
                        <Printer className="inline size-8" />
                    </button>
                </div>
                <div className="-mx-3 print:mx-0">
                    <table className={cn(bs.table, bs.tableStriped)}>
                        <thead>
                            <tr>
                                <th className="w-1/12 text-center">Match</th>
                                {columns.map((column) => (
                                    <th key={`${column.color}-${column.seat}`} className="w-1/12 text-center capitalize">
                                        {column.color} {column.seat + 1}
                                    </th>
                                ))}
                                <th className="text-left">Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {matches.map((match) => (
                                <tr key={match.id} className="break-inside-avoid">
                                    <td className="text-center">{shortMatchName(match)}</td>
                                    {columns.map((column) => (
                                        <td key={`${column.color}-${column.seat}`} className="text-center">
                                            {membersOf(match, column.color)[column.seat]?.team?.number}
                                        </td>
                                    ))}
                                    <td className="text-center" />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
