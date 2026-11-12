import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

interface CycleRow {
    id: number;
    number: number;
    type: CompetitionMatch['type'];
    round: string | null;
    field: number | null;
    scheduled: string | null;
    started: string | null;
    ended: string | null;
    cycle_seconds: number | null;
    drift_seconds: number | null;
}

interface CycleSummary {
    played: number;
    remaining: number;
    average_cycle_seconds: number | null;
    median_cycle_seconds: number | null;
    planned_cycle_seconds: number | null;
    drift_seconds: number | null;
}

function shortMatchName(row: Pick<CycleRow, 'number' | 'type' | 'round'>): string {
    if (row.type === 'practice') {
        return `P${row.number}`;
    }

    return row.type === 'elimination' ? getMatchTitle(row) : `Q${row.number}`;
}

function formatDuration(seconds: number | null): string {
    if (seconds === null) {
        return '';
    }

    return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
}

function formatDifference(seconds: number | null): string {
    if (seconds === null) {
        return '';
    }

    if (Math.abs(seconds) < 60) {
        return 'On Time';
    }

    return `${Math.floor(Math.abs(seconds) / 60)}m ${seconds > 0 ? 'Behind' : 'Ahead'}`;
}

function formatClock(at: string | null, timeZone?: string): string {
    if (!at) {
        return '';
    }

    try {
        return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone });
    } catch {
        return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
}

/**
 * Cycle times, like FTC Live's Cycle Time report: when each match was meant
 * to start, when it did, how far that is from the schedule, and the time
 * until the next match started.
 */
export default function CycleReport() {
    const { event, rows, summary } = usePage<SharedData & { rows: CycleRow[]; summary: CycleSummary }>().props;
    const [condensed, setCondensed] = useState(false);

    return (
        <PrintLayout
            title={`${event?.name ?? ''} Cycle Time Report`}
            toolbar={
                <label>
                    <input type="checkbox" checked={condensed} onChange={() => setCondensed(!condensed)} />
                    Condensed
                </label>
            }
        >
            <ReportRow>
                <table
                    className={cn(
                        bs.table,
                        bs.tableStriped,
                        'text-center',
                        condensed && '[&_td]:px-[.25em] [&_td]:py-0 [&_th]:px-[.25em] [&_th]:py-0',
                    )}
                >
                    <thead>
                        <tr>
                            <th scope="col">Match</th>
                            <th scope="col">Scheduled Start</th>
                            <th scope="col" title="The actual start time of the match">
                                Start
                            </th>
                            <th scope="col" title="The difference between scheduled and actual starting time">
                                Difference
                            </th>
                            <th scope="col" title="Time from start of match to start of next match">
                                Cycle Time
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td>{shortMatchName(row)}</td>
                                <td>{formatClock(row.scheduled, event?.timezone)}</td>
                                <td>{formatClock(row.started, event?.timezone)}</td>
                                <td>{formatDifference(row.drift_seconds)}</td>
                                <td>{formatDuration(rows[index + 1]?.cycle_seconds ?? null)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ReportRow>
            <hr className="my-4 border-t border-black/25" />
            <div className="flex">
                <div className="w-10/12 text-right">Average Cycle Time (Including Breaks):</div>
                <div className="w-2/12 text-right">{formatDuration(summary.average_cycle_seconds)}</div>
            </div>
        </PrintLayout>
    );
}
