import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
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

    return (
        <PrintLayout title={`${event?.name ?? ''} Practice Match Participation`} printable={false}>
            <ReportRow>
                <table className={cn(bs.table, bs.tableStriped, 'text-left')}>
                    <thead>
                        <tr>
                            <th scope="col">Team Number</th>
                            <th scope="col">Team Name</th>
                            <th scope="col">Played</th>
                            <th scope="col">Scheduled Unplayed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((row) => (
                            <tr key={row.team.id}>
                                <td>{row.team.number}</td>
                                <td>{row.team.name}</td>
                                <td>{row.played}</td>
                                <td>{row.remaining}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ReportRow>
        </PrintLayout>
    );
}
