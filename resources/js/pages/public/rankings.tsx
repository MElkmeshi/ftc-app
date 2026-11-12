import { useChangedAt } from '@/hooks/use-changed-at';
import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type SharedData, type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { useState } from 'react';

interface QualificationProgress {
    teams: number;
    played: number;
    remaining: number;
}

export default function PublicRankings() {
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');
    const { value: progress } = useProp<QualificationProgress>('progress');
    const { rankingMethod, event } = usePage<SharedData & { rankingMethod?: string }>().props;
    const [condensed, setCondensed] = useState(false);
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
        <PublicLayout>
            <Head title="Rankings" />

            <div className={cn(condensed && '[&_td]:p-0! [&_th]:p-0!')}>
                <br />
                <div className="-mx-3 flex flex-wrap justify-center">
                    <div className="w-3/12 px-3 print:hidden">
                        <label>
                            <input type="checkbox" checked={condensed} onChange={(changeEvent) => setCondensed(changeEvent.target.checked)} />
                            Condensed
                        </label>
                    </div>
                    <h2 className={cn(bs.h2, 'w-6/12 px-3 text-center')}>{event?.name} Rankings</h2>
                    <div className="w-2/12 px-3 print:hidden">&nbsp;</div>
                    <button type="button" className={cn(bs.btnLight, 'w-1/12 print:hidden')} onClick={() => window.print()} title="Print">
                        <Printer className="mx-auto size-8" />
                    </button>
                </div>

                {progress && (
                    <div className="-mx-3">
                        <table className={bs.table}>
                            <tbody>
                                <tr>
                                    <td className="text-right">Teams:</td>
                                    <td>{progress.teams}</td>
                                    <td className="text-right">Most Matches by Team:</td>
                                    <td>{Math.max(0, ...teams.map((team) => team.played))}</td>
                                    <td className="text-right">Total Matches Played:</td>
                                    <td>{progress.played}</td>
                                    <td className="text-right">Total Matches Remaining:</td>
                                    <td>{progress.remaining}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="-mx-3">
                    <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                        <thead>
                            <tr>
                                <th scope="col">Rank</th>
                                <th scope="col">Team #</th>
                                <th scope="col">Team</th>
                                {columns.map((column) => (
                                    <th key={column.label} scope="col">
                                        {column.label}
                                    </th>
                                ))}
                                <th scope="col">Played</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team, index) => (
                                <tr key={team.team_id}>
                                    <td>{team.rank ?? index + 1}</td>
                                    <td>{team.team_number}</td>
                                    <td>{team.team_name}</td>
                                    {columns.map((column) => (
                                        <td key={column.label}>{team.played === 0 ? '--' : column.value(team)}</td>
                                    ))}
                                    <td>{team.played}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <small className="block text-center text-[0.875em]">
                    Data current as of {updatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })}
                </small>
            </div>
        </PublicLayout>
    );
}
