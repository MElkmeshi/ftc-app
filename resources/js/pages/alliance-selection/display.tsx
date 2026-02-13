import { useAllianceGroups, useAllianceSelectionRankings } from '@/hooks/use-alliance-selection';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { Trophy, Users } from 'lucide-react';

export default function AllianceSelectionDisplay() {
    const { data: rankings = [], isLoading: rankingsLoading } = useAllianceSelectionRankings();
    const { data: groups = [], isLoading: groupsLoading } = useAllianceGroups(3000);

    const isLoading = rankingsLoading || groupsLoading;
    const hasGroups = groups.length > 0;

    // Find the next group that needs a pick
    const currentPickIndex = hasGroups ? groups.findIndex((g) => g.picked_team === null) : -1;

    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
                <Head title="Alliance Selection" />
                <div className="text-center">
                    <div className="mb-4 inline-block h-16 w-16 animate-spin rounded-full border-8 border-solid border-white border-r-transparent" />
                    <p className="text-2xl text-white">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-slate-900 to-slate-800">
            <Head title="Alliance Selection" />

            <div className="min-h-screen p-8">
                <div className="mx-auto max-w-7xl">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <div className="mb-4 flex items-center justify-center gap-4">
                            <Users className="h-16 w-16 text-yellow-400" />
                            <h1 className="text-6xl font-bold text-white">Alliance Selection</h1>
                        </div>
                        {hasGroups && currentPickIndex >= 0 && (
                            <p className="text-3xl text-yellow-400">
                                Alliance #{groups[currentPickIndex].seed} is picking...
                            </p>
                        )}
                        {hasGroups && currentPickIndex === -1 && (
                            <p className="text-3xl text-green-400">All alliances formed!</p>
                        )}
                        {!hasGroups && (
                            <p className="text-2xl text-white/70">Waiting for alliance selection to begin...</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* Alliance Groups */}
                        <div>
                            <h2 className="mb-4 text-3xl font-bold text-white">
                                {hasGroups ? 'Alliances' : 'Waiting...'}
                            </h2>
                            {hasGroups ? (
                                <div className="space-y-4">
                                    {groups.map((group, index) => {
                                        const isCurrentPick = index === currentPickIndex;
                                        return (
                                            <div
                                                key={group.id}
                                                className={cn(
                                                    'rounded-2xl border-2 p-6 transition-all duration-500',
                                                    isCurrentPick
                                                        ? 'animate-pulse border-yellow-400 bg-yellow-400/10'
                                                        : group.picked_team
                                                            ? 'border-green-500/50 bg-green-500/10'
                                                            : 'border-white/20 bg-white/5',
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className={cn(
                                                            'flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold',
                                                            isCurrentPick
                                                                ? 'bg-yellow-400 text-slate-900'
                                                                : group.picked_team
                                                                    ? 'bg-green-500 text-white'
                                                                    : 'bg-white/20 text-white',
                                                        )}
                                                    >
                                                        {group.seed}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="text-2xl font-bold text-white">
                                                            Captain: #{group.captain_team.number}
                                                        </div>
                                                        <div className="text-lg text-white/70">{group.captain_team.name}</div>
                                                        {group.picked_team ? (
                                                            <div className="mt-2 text-xl font-semibold text-green-400">
                                                                Pick: #{group.picked_team.number} - {group.picked_team.name}
                                                            </div>
                                                        ) : (
                                                            <div className="mt-2 text-xl text-yellow-400/70">
                                                                {isCurrentPick ? 'Selecting...' : 'Waiting...'}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="rounded-2xl border-2 border-white/10 bg-white/5 p-12 text-center">
                                    <Users className="mx-auto mb-4 h-16 w-16 text-white/30" />
                                    <p className="text-2xl text-white/50">Selection not started</p>
                                </div>
                            )}
                        </div>

                        {/* Rankings */}
                        <div>
                            <h2 className="mb-4 text-3xl font-bold text-white">
                                <Trophy className="mr-2 inline h-8 w-8 text-yellow-400" />
                                Rankings
                            </h2>
                            <div className="overflow-hidden rounded-2xl border-2 border-white/10 bg-white/5 backdrop-blur-sm">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b-2 border-white/20 bg-white/10">
                                            <th className="px-6 py-4 text-left text-lg font-bold text-white">Rank</th>
                                            <th className="px-6 py-4 text-left text-lg font-bold text-white">Team</th>
                                            <th className="px-6 py-4 text-right text-lg font-bold text-white">Score</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rankings.map((team, index) => {
                                            const isCaptain = groups.some((g) => g.captain_team.id === team.team_id);
                                            const isPicked = groups.some((g) => g.picked_team?.id === team.team_id);
                                            const isTaken = isCaptain || isPicked;

                                            return (
                                                <tr
                                                    key={team.team_id}
                                                    className={cn(
                                                        'border-b border-white/10 transition-all',
                                                        isTaken ? 'opacity-40' : 'hover:bg-white/5',
                                                        isCaptain && 'bg-yellow-500/10',
                                                    )}
                                                >
                                                    <td className="px-6 py-3">
                                                        <div
                                                            className={cn(
                                                                'flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold',
                                                                index < groups.length
                                                                    ? 'bg-yellow-400 text-slate-900'
                                                                    : 'bg-white/20 text-white',
                                                            )}
                                                        >
                                                            {index + 1}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <span className="text-xl font-bold text-white">#{team.team_number}</span>
                                                        <span className="ml-2 text-lg text-white/70">{team.team_name}</span>
                                                        {isCaptain && (
                                                            <span className="ml-2 rounded bg-yellow-400 px-2 py-0.5 text-xs font-bold text-slate-900">
                                                                CAPTAIN
                                                            </span>
                                                        )}
                                                        {isPicked && (
                                                            <span className="ml-2 rounded bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                                                                PICKED
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-right text-xl font-semibold text-white/80">
                                                        {team.total_score}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
