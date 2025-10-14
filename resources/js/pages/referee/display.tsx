import { useTeamsDisplay } from '@/hooks/use-match';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Trophy } from 'lucide-react';

export default function RefereeDisplay() {
    const { data: teams = [], isLoading } = useTeamsDisplay(3000);

    const getAllianceColorClasses = (color: string) => {
        if (color === 'red') {
            return {
                bg: 'bg-red-600',
                text: 'text-red-600',
                border: 'border-red-500',
            };
        }
        if (color === 'blue') {
            return {
                bg: 'bg-blue-600',
                text: 'text-blue-600',
                border: 'border-blue-500',
            };
        }
        return {
            bg: 'bg-gray-600',
            text: 'text-gray-600',
            border: 'border-gray-500',
        };
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Head title="Teams Display" />
                <div className="text-center">
                    <div className="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-8 border-solid border-white border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                    <p className="text-2xl text-white">Loading teams...</p>
                </div>
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Head title="Teams Display" />
                <div className="text-center">
                    <Trophy className="mx-auto mb-6 h-24 w-24 text-white/50" />
                    <h1 className="mb-3 text-4xl font-bold text-white">No Completed Matches</h1>
                    <p className="text-xl text-white/70">Waiting for matches to be completed...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
            <Head title="Teams Display" />

            <div className="min-h-screen p-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex items-center justify-center gap-4">
                            <Trophy className="h-16 w-16 text-yellow-400" />
                            <h1 className="text-6xl font-bold text-white">Team Rankings</h1>
                        </div>
                        <p className="text-2xl text-white/70">Cumulative Scores from All Completed Matches</p>
                    </div>

                    {/* Teams Table */}
                    <div className="overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-white/20 bg-white/10">
                                    <th className="px-8 py-6 text-left text-2xl font-bold text-white">Rank</th>
                                    <th className="px-8 py-6 text-left text-2xl font-bold text-white">Team Number</th>
                                    <th className="px-8 py-6 text-left text-2xl font-bold text-white">Team Name</th>
                                    <th className="px-8 py-6 text-center text-2xl font-bold text-white">Alliance</th>
                                    <th className="px-8 py-6 text-right text-2xl font-bold text-white">Team Score</th>
                                    <th className="px-8 py-6 text-right text-2xl font-bold text-white">Alliance Score</th>
                                    <th className="px-8 py-6 text-right text-2xl font-bold text-white">Total Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teams.map((team, index) => {
                                    const colorClasses = getAllianceColorClasses(team.alliance_color);
                                    const isTopThree = index < 3;

                                    return (
                                        <tr
                                            key={team.team_id}
                                            className={cn(
                                                'border-b border-white/10 transition-all hover:bg-white/5',
                                                isTopThree && 'bg-yellow-500/10',
                                            )}
                                        >
                                            <td className="px-8 py-6">
                                                <div
                                                    className={cn(
                                                        'flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold',
                                                        isTopThree ? 'bg-yellow-400 text-slate-900' : 'bg-white/20 text-white',
                                                    )}
                                                >
                                                    {index + 1}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-3xl font-bold text-white">#{team.team_number}</td>
                                            <td className="px-8 py-6 text-2xl text-white/90">{team.team_name}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <span
                                                        className={cn(
                                                            'rounded-full px-6 py-2 text-xl font-bold text-white uppercase',
                                                            colorClasses.bg,
                                                        )}
                                                    >
                                                        {team.alliance_color}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right text-3xl font-semibold text-white/80">{team.team_score}</td>
                                            <td className="px-8 py-6 text-right text-3xl font-semibold text-white/80">{team.alliance_score}</td>
                                            <td className="px-8 py-6 text-right">
                                                <div
                                                    className={cn(
                                                        'inline-flex rounded-lg px-6 py-3 text-4xl font-bold',
                                                        isTopThree ? 'bg-yellow-400 text-slate-900' : 'bg-white/10 text-white',
                                                    )}
                                                >
                                                    {team.total_score}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-xl text-white/50">
                            Showing {teams.length} team{teams.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
