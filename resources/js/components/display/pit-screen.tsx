import { AutoScroll } from '@/components/audience/auto-scroll';
import { formatMatchTime, getAllianceMembers, getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData, type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { Clock, Trophy } from 'lucide-react';

const UPCOMING_COUNT = 8;

function RankingsTable({ teams, byRecord }: { teams: TeamDisplay[]; byRecord: boolean }) {
    if (teams.length === 0) {
        return <p className="p-8 text-center text-2xl text-white/50">Rankings appear after the first qualification match.</p>;
    }

    return (
        <table className="w-full text-2xl">
            <thead className="sticky top-0 bg-slate-900 text-left text-base tracking-wider text-white/50 uppercase">
                <tr>
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Team</th>
                    <th className="px-4 py-3 text-center">W-L-T</th>
                    <th className="px-4 py-3 text-right">{byRecord ? 'RP' : 'Points'}</th>
                    <th className="px-4 py-3 text-right">Played</th>
                </tr>
            </thead>
            <tbody>
                {teams.map((team, index) => (
                    <tr key={team.team_id} className={cn('border-t border-white/5', index % 2 === 1 && 'bg-white/[0.03]')}>
                        <td className="px-4 py-2 font-bold tabular-nums">{index + 1}</td>
                        <td className="px-4 py-2">
                            <span className="font-bold tabular-nums">{team.team_number}</span> <span className="text-white/70">{team.team_name}</span>
                        </td>
                        <td className="px-4 py-2 text-center tabular-nums">
                            {team.wins}-{team.losses}-{team.ties}
                        </td>
                        <td className="px-4 py-2 text-right font-bold tabular-nums">
                            {byRecord ? team.ranking_points.toFixed(2) : team.total_score}
                        </td>
                        <td className="px-4 py-2 text-right text-white/60 tabular-nums">{team.played}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function MatchRow({ match, timeZone, live }: { match: CompetitionMatch; timeZone?: string; live?: boolean }) {
    return (
        <div className={cn('rounded-xl border p-3', live ? 'border-emerald-400 bg-emerald-500/10' : 'border-white/10 bg-white/5')}>
            <div className="mb-1 flex items-baseline justify-between">
                <span className="text-xl font-bold">{getMatchTitle(match)}</span>
                <span className={cn('text-lg tabular-nums', live ? 'font-bold text-emerald-300' : 'text-white/60')}>
                    {live ? 'ON FIELD' : formatMatchTime(match.start_time, timeZone)}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xl font-semibold tabular-nums">
                <span className="rounded bg-red-500/20 px-2 py-1 text-red-200">
                    {getAllianceMembers(match, 'red')
                        .map((member) => member.team.number)
                        .join(' · ')}
                </span>
                <span className="rounded bg-blue-500/20 px-2 py-1 text-blue-200">
                    {getAllianceMembers(match, 'blue')
                        .map((member) => member.team.number)
                        .join(' · ')}
                </span>
            </div>
        </div>
    );
}

/**
 * The TV in the pits: rankings scroll on their own on the left, and the
 * match on the field plus what's coming up sit on the right, so teams know
 * when to queue.
 */
export function PitScreen() {
    const { event, rankingMethod } = usePage<SharedData & { rankingMethod?: string }>().props;
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');

    const onField = matches.find((match) => match.status === 'ongoing');
    const upcoming = matches.filter((match) => match.status === 'upcoming').slice(0, UPCOMING_COUNT);

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
            <Head title="Pit Display" />

            <header className="flex items-center justify-between border-b border-white/10 bg-white/5 px-8 py-4">
                <h1 className="text-3xl font-black">{event?.name}</h1>
                <span className="text-xl text-white/50">Pit display</span>
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-[3fr_2fr] gap-6 p-6">
                <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-slate-900/60">
                    <h2 className="flex items-center gap-2 px-6 py-4 text-2xl font-bold">
                        <Trophy className="size-6 text-yellow-400" /> Rankings
                    </h2>
                    <AutoScroll className="min-h-0 flex-1">
                        <RankingsTable teams={teams} byRecord={rankingMethod === 'record'} />
                    </AutoScroll>
                </section>

                <section className="flex min-h-0 flex-col gap-3 overflow-hidden">
                    <h2 className="flex items-center gap-2 text-2xl font-bold">
                        <Clock className="size-6 text-sky-300" /> Up next
                    </h2>
                    {onField && <MatchRow match={onField} timeZone={event?.timezone} live />}
                    {upcoming.map((match) => (
                        <MatchRow key={match.id} match={match} timeZone={event?.timezone} />
                    ))}
                    {!onField && upcoming.length === 0 && <p className="text-xl text-white/50">No more scheduled matches.</p>}
                </section>
            </div>
        </div>
    );
}
