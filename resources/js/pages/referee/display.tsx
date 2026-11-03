import { cn } from '@/lib/utils';
import { type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { Trophy } from 'lucide-react';

const PODIUM_STYLES = ['bg-yellow-400 text-slate-900', 'bg-slate-300 text-slate-900', 'bg-amber-600 text-white'];

export default function RefereeDisplay() {
    // Live prop: the server reloads it when a match ends or a score changes
    // (see routes/web.php), so there's no polling here.
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');
    const { rankingMethod } = usePage<{ rankingMethod?: string }>().props;
    const byRecord = rankingMethod === 'record';

    if (teams.length === 0) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
                <Head title="Teams Display" />
                <div className="text-center">
                    <Trophy className="mx-auto mb-6 size-24 text-white/40" />
                    <h1 className="mb-3 text-4xl font-bold text-white">No Completed Matches</h1>
                    <p className="text-xl text-white/60">Waiting for matches to be completed…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-8 py-6">
            <Head title="Teams Display" />

            <div className="mx-auto max-w-7xl">
                <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Trophy className="size-10 text-yellow-400" />
                        <div>
                            <h1 className="text-4xl font-bold text-white">Team Rankings</h1>
                            <p className="text-base text-white/55">
                                {byRecord
                                    ? 'Ranked by win/loss record from completed qualification matches'
                                    : 'Cumulative scores from all completed qualification matches'}
                            </p>
                        </div>
                    </div>
                    <div className="text-lg text-white/50">
                        {teams.length} team{teams.length !== 1 ? 's' : ''}
                    </div>
                </header>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl">
                    <table className="w-full table-fixed">
                        <colgroup>
                            <col className="w-24" />
                            <col className="w-36" />
                            <col />
                            <col className="w-32" />
                            <col className="w-24" />
                            <col className="w-32" />
                            <col className="w-32" />
                            <col className="w-40" />
                        </colgroup>
                        <thead>
                            <tr className="border-b border-white/15 bg-white/5 text-sm font-semibold tracking-wider whitespace-nowrap text-white/60 uppercase">
                                <th className="px-6 py-3 text-left">Rank</th>
                                <th className="px-4 py-3 text-left">Team</th>
                                <th className="px-4 py-3 text-left">Name</th>
                                <th className="px-4 py-3 text-center">W-L-T</th>
                                <th className="px-4 py-3 text-right">Played</th>
                                <th className="px-4 py-3 text-right">{byRecord ? 'Avg score' : 'Team pts'}</th>
                                <th className="px-4 py-3 text-right">{byRecord ? 'Best' : 'Alliance pts'}</th>
                                <th className="px-6 py-3 text-right">{byRecord ? 'Ranking pts' : 'Total'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team, index) => {
                                const podiumStyle = PODIUM_STYLES[index];

                                return (
                                    <tr
                                        key={team.team_id}
                                        className={cn('border-b border-white/5 last:border-b-0', index % 2 === 1 && 'bg-white/[0.03]')}
                                    >
                                        <td className="px-6 py-3">
                                            <div
                                                className={cn(
                                                    'flex size-11 items-center justify-center rounded-full text-xl font-bold tabular-nums',
                                                    podiumStyle ?? 'bg-white/10 text-white/80',
                                                )}
                                            >
                                                {index + 1}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-3xl font-bold text-white tabular-nums">#{team.team_number}</td>
                                        <td className="truncate px-4 py-3 text-2xl text-white/85" title={team.team_name}>
                                            {team.team_name}
                                        </td>
                                        <td className="px-4 py-3 text-center text-2xl font-semibold text-white/80 tabular-nums">
                                            {team.wins}-{team.losses}-{team.ties}
                                        </td>
                                        <td className="px-4 py-3 text-right text-2xl font-semibold text-white/60 tabular-nums">{team.played}</td>
                                        <td className="px-4 py-3 text-right text-2xl font-semibold text-white/60 tabular-nums">
                                            {byRecord ? team.average_score : team.team_score}
                                        </td>
                                        <td className="px-4 py-3 text-right text-2xl font-semibold text-white/60 tabular-nums">
                                            {byRecord ? team.highest_score : team.alliance_score}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <span
                                                className={cn(
                                                    'inline-block min-w-20 rounded-lg px-4 py-1.5 text-center text-3xl font-black tabular-nums',
                                                    podiumStyle ? 'bg-yellow-400/15 text-yellow-300' : 'text-white',
                                                )}
                                            >
                                                {byRecord ? team.ranking_points.toFixed(2) : team.total_score}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
