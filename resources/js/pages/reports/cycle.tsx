import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';

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

function formatDuration(seconds: number | null): string {
    if (seconds === null) {
        return '—';
    }

    const absolute = Math.abs(seconds);
    const hours = Math.floor(absolute / 3600);
    const minutes = Math.floor((absolute % 3600) / 60);
    const rest = absolute % 60;
    const text =
        hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}` : `${minutes}:${String(rest).padStart(2, '0')}`;

    return seconds < 0 ? `-${text}` : text;
}

function formatDrift(seconds: number | null): string {
    if (seconds === null) {
        return '—';
    }

    if (Math.abs(seconds) < 60) {
        return 'on time';
    }

    return `${formatDuration(Math.abs(seconds))} ${seconds > 0 ? 'behind' : 'ahead'}`;
}

function formatClock(at: string | null, timeZone?: string): string {
    if (!at) {
        return '—';
    }

    try {
        return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZone });
    } catch {
        return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
    return (
        <div className="rounded-lg border px-4 py-3">
            <div className="text-muted-foreground text-xs uppercase">{label}</div>
            <div
                className={cn(
                    'text-2xl font-bold tabular-nums',
                    tone === 'good' && 'text-emerald-600 dark:text-emerald-400',
                    tone === 'bad' && 'text-red-600 dark:text-red-400',
                )}
            >
                {value}
            </div>
        </div>
    );
}

/**
 * Cycle times, like FTC Live's Cycle Time report: when each match was meant
 * to start, when it did, the time since the previous start, and how far
 * behind or ahead of the schedule the event is running.
 */
export default function CycleReport() {
    const { event, rows, summary } = usePage<SharedData & { rows: CycleRow[]; summary: CycleSummary }>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Reports', href: '/reports' },
        { title: 'Cycle times', href: '/reports/cycle' },
    ];
    const lateness = summary.drift_seconds;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cycle times" />

            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h1 className="text-2xl font-bold">Cycle times</h1>
                        <p className="text-muted-foreground text-sm">
                            {summary.played} of {summary.played + summary.remaining} matches started. Cycle is the time from one match start to the
                            next, so breaks show up as long cycles.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                        <Printer className="mr-1 size-4" /> Print
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat label="Planned cycle" value={formatDuration(summary.planned_cycle_seconds)} />
                    <Stat label="Median cycle" value={formatDuration(summary.median_cycle_seconds)} />
                    <Stat label="Average cycle" value={formatDuration(summary.average_cycle_seconds)} />
                    <Stat
                        label="Last start vs schedule"
                        value={formatDrift(lateness)}
                        tone={lateness === null || Math.abs(lateness) < 60 ? undefined : lateness > 0 ? 'bad' : 'good'}
                    />
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">Match</th>
                                <th className="px-3 py-2 text-right">Scheduled</th>
                                <th className="px-3 py-2 text-right">Started</th>
                                <th className="px-3 py-2 text-right">Ended</th>
                                <th className="px-3 py-2 text-right">Cycle</th>
                                <th className="px-3 py-2 text-right">vs schedule</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {rows.map((row) => (
                                <tr key={row.id} className={cn(!row.started && 'text-muted-foreground')}>
                                    <td className="px-3 py-1.5">
                                        {getMatchTitle(row)}
                                        {getFieldLabel({ field: row.field ?? undefined }, event?.field_count ?? 1) && (
                                            <span className="text-muted-foreground">
                                                {' '}
                                                · {getFieldLabel({ field: row.field ?? undefined }, event?.field_count ?? 1)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatClock(row.scheduled, event?.timezone)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatClock(row.started, event?.timezone)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatClock(row.ended, event?.timezone)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatDuration(row.cycle_seconds)}</td>
                                    <td
                                        className={cn(
                                            'px-3 py-1.5 text-right tabular-nums',
                                            row.drift_seconds !== null && row.drift_seconds >= 60 && 'text-red-600 dark:text-red-400',
                                            row.drift_seconds !== null && row.drift_seconds <= -60 && 'text-emerald-600 dark:text-emerald-400',
                                        )}
                                    >
                                        {formatDrift(row.drift_seconds)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
