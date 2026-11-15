import { bs } from '@/lib/bootstrap';
import { type PitTeamRow } from '@/lib/pit-map';
import { cn } from '@/lib/utils';
import { TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';

export type PitTeamColumn = 'number' | 'name' | 'pit' | 'address';

const TITLES: Record<PitTeamColumn, string> = {
    number: 'Number',
    name: 'Name',
    pit: 'Pit Number',
    address: 'Pit Address',
};

function compare(a: PitTeamRow, b: PitTeamRow, column: PitTeamColumn): number {
    if (column === 'number') {
        return a.number - b.number;
    }

    if (column === 'pit') {
        return (parseInt(a.pit, 10) || 0) - (parseInt(b.pit, 10) || 0);
    }

    return a[column].localeCompare(b[column]);
}

interface PitTeamTableProps {
    rows: PitTeamRow[];
    columns: PitTeamColumn[];
    small?: boolean;
    showCount?: boolean;
    onRowClick?: (row: PitTeamRow) => void;
    className?: string;
}

export default function PitTeamTable({ rows, columns, small = false, showCount = false, onRowClick, className }: PitTeamTableProps) {
    const [sort, setSort] = useState<{ column: PitTeamColumn; ascending: boolean }>({ column: 'number', ascending: true });
    const sorted = useMemo(() => {
        const ordered = [...rows].sort((a, b) => compare(a, b, sort.column));

        return sort.ascending ? ordered : ordered.reverse();
    }, [rows, sort]);

    return (
        <div id="pitAssignmentTable_wrapper" className={className}>
            <table
                id="pitAssignmentTable"
                className={cn(bs.table, bs.tableStriped, small && bs.tableSm, '[&_tbody_tr:hover>*]:bg-[rgba(0,0,0,0.075)]')}
            >
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column}
                                scope="col"
                                className="cursor-pointer text-left select-none"
                                aria-sort={sort.column === column ? (sort.ascending ? 'ascending' : 'descending') : undefined}
                                onClick={() => setSort({ column, ascending: sort.column === column ? !sort.ascending : true })}
                            >
                                <span className="flex items-center justify-between">
                                    {TITLES[column]}
                                    <span className="flex flex-col text-[0.5rem] leading-[0.6rem] print:hidden" aria-hidden>
                                        <span className={sort.column === column && sort.ascending ? 'opacity-60' : 'opacity-15'}>▲</span>
                                        <span className={sort.column === column && !sort.ascending ? 'opacity-60' : 'opacity-15'}>▼</span>
                                    </span>
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((row) => (
                        <tr key={row.number} onClick={onRowClick && (() => onRowClick(row))}>
                            {columns.map((column) => (
                                <td key={column}>
                                    {column === 'name' && row.notPresent ? (
                                        <em>
                                            <TriangleAlert className="inline size-4" /> {row.name}
                                        </em>
                                    ) : (
                                        row[column]
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {showCount && (
                <div>
                    Showing {rows.length === 0 ? 0 : 1} to {rows.length} of {rows.length} entries
                </div>
            )}
        </div>
    );
}
