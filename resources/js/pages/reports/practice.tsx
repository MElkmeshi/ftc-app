import PrintLayout from '@/layouts/print-layout';
import { cn } from '@/lib/utils';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';

interface PracticeRow {
    team: Pick<Team, 'id' | 'number' | 'name'>;
    played: number;
    remaining: number;
}

/**
 * How many practice matches each team has played and still has to play
 * (FTC Live's practice participation report).
 */
export default function PracticeReport() {
    const { event, teams } = usePage<SharedData & { teams: PracticeRow[] }>().props;
    const notPlayed = teams.filter((row) => row.played === 0).length;

    return (
        <PrintLayout title="Practice participation">
            <p className="text-sm text-gray-600">{event?.name}</p>
            <h2 className="text-2xl font-bold">Practice participation</h2>
            <p className="mb-3 text-sm text-gray-600">
                {notPlayed === 0
                    ? 'Every team has played a practice match.'
                    : `${notPlayed} of ${teams.length} teams have not played a practice match yet.`}
            </p>
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="w-20 py-1">Team</th>
                        <th className="py-1">Name</th>
                        <th className="w-24 py-1 text-right">Played</th>
                        <th className="w-32 py-1 text-right">Still to play</th>
                    </tr>
                </thead>
                <tbody>
                    {teams.map((row) => (
                        <tr key={row.team.id} className={cn('border-b', row.played === 0 && 'bg-amber-50 dark:bg-amber-950/30 print:bg-transparent')}>
                            <td className="py-1.5 font-mono font-bold">{row.team.number}</td>
                            <td className="py-1.5">{row.team.name}</td>
                            <td className="py-1.5 text-right tabular-nums">{row.played}</td>
                            <td className="py-1.5 text-right tabular-nums">{row.remaining}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </PrintLayout>
    );
}
