import { useChangedAt } from '@/hooks/use-changed-at';
import EventPageLayout from '@/layouts/event-page-layout';
import { cn } from '@/lib/utils';
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
              { label: 'RS', value: (team) => team.ranking_points.toFixed(2) },
              { label: 'Avg', value: (team) => team.average_score },
              { label: 'Best', value: (team) => team.highest_score },
          ]
        : [
              { label: 'Total', value: (team) => team.total_score },
              { label: 'Team Pts', value: (team) => team.team_score },
              { label: 'Alliance Pts', value: (team) => team.alliance_score },
          ];

    return (
        <EventPageLayout title="Rankings" updatedAt={updatedAt}>
            <Head title="Rankings" />

            {progress && (
                <div className="flex flex-wrap justify-around gap-x-6 gap-y-1 border-b pb-3">
                    <span>
                        Teams: <span className="ml-2">{progress.teams}</span>
                    </span>
                    <span>
                        Total Matches Played: <span className="ml-2">{progress.played}</span>
                    </span>
                    <span>
                        Total Matches Remaining: <span className="ml-2">{progress.remaining}</span>
                    </span>
                </div>
            )}

            {teams.length === 0 ? (
                <p className="py-12 text-center">Rankings appear after the first qualification match.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-center">
                        <thead>
                            <tr className="border-b-2 border-black/80">
                                <th className="p-2">Rank</th>
                                <th className="p-2">Team #</th>
                                <th className="p-2">Team</th>
                                {columns.map((column, columnIndex) => (
                                    <th key={column.label} className={cn('p-2 whitespace-nowrap', columnIndex >= 2 && 'hidden sm:table-cell')}>
                                        {column.label}
                                    </th>
                                ))}
                                <th className="p-2">Played</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team, index) => (
                                <tr key={team.team_id} className="break-inside-avoid border-b odd:bg-black/[0.05] dark:odd:bg-white/[0.05]">
                                    <td className="p-2 tabular-nums">{team.rank ?? index + 1}</td>
                                    <td className="p-2 tabular-nums">{team.team_number}</td>
                                    <td className="max-w-64 truncate p-2">{team.team_name}</td>
                                    {columns.map((column, columnIndex) => (
                                        <td key={column.label} className={cn('p-2 tabular-nums', columnIndex >= 2 && 'hidden sm:table-cell')}>
                                            {column.value(team)}
                                        </td>
                                    ))}
                                    <td className="p-2 tabular-nums">{team.played}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </EventPageLayout>
    );
}
