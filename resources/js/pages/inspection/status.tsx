import { InspectionStatusBadge } from '@/components/inspection-status-badge';
import { INSPECTION_STATUSES, inspectionStatusOf, passedShare, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { useState } from 'react';

const COLUMN_CLASSES: Record<number, string> = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' };

function readColumns(): number {
    const columns = Number(new URLSearchParams(window.location.search).get('columns'));

    return columns >= 1 && columns <= 3 ? columns : 2;
}

/**
 * The inspection status board for a projector or the pit (FTC Live's
 * Inspection Status page). It carries no notes, only each team's result.
 */
export default function InspectionStatusBoard() {
    const { event } = usePage<SharedData>().props;
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('teams');
    const [columns, setColumns] = useState(readColumns);
    const share = passedShare(teams);

    return (
        <div className="bg-background text-foreground min-h-screen p-4 sm:p-6">
            <Head title="Inspection status" />

            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <p className="text-muted-foreground">{event?.name}</p>
                    <h1 className="text-3xl font-bold">Inspection status</h1>
                </div>
                <div className="flex items-center gap-1 text-sm print:hidden">
                    <span className="text-muted-foreground mr-1">Columns</span>
                    {[1, 2, 3].map((count) => (
                        <button
                            key={count}
                            type="button"
                            onClick={() => setColumns(count)}
                            className={cn('rounded-md border px-2.5 py-1', columns === count && 'bg-primary text-primary-foreground')}
                        >
                            {count}
                        </button>
                    ))}
                </div>
            </header>

            <div className="mb-4">
                <div className="mb-1 flex justify-between text-sm font-medium">
                    <span>{share}% passed</span>
                    <span className="flex flex-wrap gap-2">
                        {INSPECTION_STATUSES.map((status) => (
                            <InspectionStatusBadge key={status.value} status={status.value} />
                        ))}
                    </span>
                </div>
                <div className="bg-muted flex h-3 overflow-hidden rounded-full">
                    {INSPECTION_STATUSES.filter((status) => status.value !== 'not_started').map((status) => {
                        const count = teams.filter((team) => team.status === status.value).length;

                        return count === 0 ? null : (
                            <div key={status.value} className={status.className} style={{ width: `${(count / teams.length) * 100}%` }} />
                        );
                    })}
                </div>
            </div>

            {teams.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center text-lg">No teams yet.</p>
            ) : (
                <ul className={cn('grid gap-2', COLUMN_CLASSES[columns])}>
                    {teams.map((team) => (
                        <li key={team.id} className="bg-card flex items-center gap-3 rounded-lg border px-3 py-2 text-lg">
                            <span className={cn('size-4 shrink-0 rounded-full', inspectionStatusOf(team.status).className)} />
                            <span className="w-20 font-mono font-bold">{team.number}</span>
                            <span className="min-w-0 flex-1 truncate">{team.name}</span>
                            <span className="text-muted-foreground text-sm">{inspectionStatusOf(team.status).label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
