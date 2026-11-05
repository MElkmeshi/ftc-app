import { useChangedAt } from '@/hooks/use-changed-at';
import EventPageLayout from '@/layouts/event-page-layout';
import { type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';

interface QualificationProgress {
    teams: number;
    played: number;
    remaining: number;
}

/**
 * Qualification rankings for phones and print (FTC Live's Rankings page),
 * with how much of the schedule is left.
 */
export default function PublicRankings() {
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');
    const { value: progress } = useProp<QualificationProgress>('progress');
    const { rankingMethod } = usePage<{ rankingMethod?: string }>().props;
    const byRecord = rankingMethod === 'record';
    const updatedAt = useChangedAt(teams);

    const columns: { label: string; value: (team: TeamDisplay) => string | number }[] = byRecord
        ? [
              { label: 'W-L-T', value: (team) => `${team.wins}-${team.losses}-${team.ties}` },
              { label: 'Ranking pts', value: (team) => team.ranking_points.toFixed(2) },
              { label: 'Avg', value: (team) => team.average_score },
              { label: 'Best', value: (team) => team.highest_score },
          ]
        : [
              { label: 'Total', value: (team) => team.total_score },
              { label: 'Team pts', value: (team) => team.team_score },
              { label: 'Alliance pts', value: (team) => team.alliance_score },
          ];

    return (
        <EventPageLayout title="Rankings" updatedAt={updatedAt}>
            <Head title="Rankings" />

            {progress && (
                <p className="text-muted-foreground mb-4 text-sm">
                    {progress.teams} teams · {progress.played} of {progress.played + progress.remaining} qualification matches played
                </p>
            )}

            {teams.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">Rankings appear after the first qualification match.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                            <tr>
                                <th className="px-3 py-2 text-left">#</th>
                                <th className="px-3 py-2 text-left">Team</th>
                                {columns.map((column) => (
                                    <th
                                        key={column.label}
                                        className={`px-3 py-2 text-right whitespace-nowrap ${columns.indexOf(column) >= 2 ? 'hidden sm:table-cell' : ''}`}
                                    >
                                        {column.label}
                                    </th>
                                ))}
                                <th className="px-3 py-2 text-right">Played</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {teams.map((team, index) => (
                                <tr key={team.team_id} className="break-inside-avoid">
                                    <td className="px-3 py-2 font-semibold tabular-nums">{team.rank ?? index + 1}</td>
                                    <td className="px-3 py-2">
                                        <span className="font-mono font-semibold">{team.team_number}</span>
                                        <span className="text-muted-foreground block max-w-48 truncate text-xs sm:inline sm:pl-2">
                                            {team.team_name}
                                        </span>
                                    </td>
                                    {columns.map((column, columnIndex) => (
                                        <td
                                            key={column.label}
                                            className={`px-3 py-2 text-right tabular-nums ${columnIndex === 0 ? 'font-semibold' : ''} ${columnIndex >= 2 ? 'hidden sm:table-cell' : ''}`}
                                        >
                                            {column.value(team)}
                                        </td>
                                    ))}
                                    <td className="text-muted-foreground px-3 py-2 text-right tabular-nums">{team.played}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </EventPageLayout>
    );
}
