import PrintLayout from '@/layouts/print-layout';
import { formatMatchTime, getAllianceColorClasses, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

function teamNumbers(match: CompetitionMatch, color: string, except: number): string {
    return membersOf(match, color)
        .filter((matchAlliance) => matchAlliance.team?.id !== except)
        .map((matchAlliance) => matchAlliance.team?.number)
        .join(', ');
}

/**
 * Each team's own matches on its own page (FTC Live's per-team match list),
 * to hand out at check-in.
 */
export default function TeamSchedulesReport() {
    const { event, teams, matches } = usePage<SharedData & { teams: Team[]; matches: CompetitionMatch[] }>().props;
    const [teamId, setTeamId] = useState('');
    const visibleTeams = teamId ? teams.filter((team) => String(team.id) === teamId) : teams;

    return (
        <PrintLayout
            title="Team match lists"
            toolbar={
                <select className="rounded border px-2 py-1 text-sm" value={teamId} onChange={(changeEvent) => setTeamId(changeEvent.target.value)}>
                    <option value="">Every team</option>
                    {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                            {team.number} {team.name}
                        </option>
                    ))}
                </select>
            }
        >
            <div className="space-y-8 print:space-y-0">
                {visibleTeams.map((team) => {
                    const teamMatches = matches.filter((match) => match.match_alliances.some((matchAlliance) => matchAlliance.team?.id === team.id));

                    return (
                        <section key={team.id} className="break-after-page">
                            <p className="text-sm text-gray-600">{event?.name}</p>
                            <h2 className="mb-3 text-2xl font-bold">
                                <span className="font-mono">{team.number}</span> {team.name}
                            </h2>
                            {teamMatches.length === 0 ? (
                                <p className="text-gray-600">This team is not in the schedule yet.</p>
                            ) : (
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="border-b-2 text-left">
                                            <th className="py-1 pr-2">Match</th>
                                            <th className="py-1 pr-2">Time</th>
                                            <th className="py-1 pr-2">Alliance</th>
                                            <th className="py-1 pr-2">Partners</th>
                                            <th className="py-1">Opponents</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamMatches.map((match) => {
                                            const colors = allianceColorsOf(match);
                                            const ownColor =
                                                match.match_alliances.find((matchAlliance) => matchAlliance.team?.id === team.id)?.alliance.color ??
                                                '';

                                            return (
                                                <tr key={match.id} className="border-b">
                                                    <td className="py-1.5 pr-2">{getMatchTitle(match)}</td>
                                                    <td className="py-1.5 pr-2 tabular-nums">
                                                        {[
                                                            formatMatchTime(match.start_time, event?.timezone),
                                                            getFieldLabel(match, event?.field_count ?? 1),
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' · ')}
                                                    </td>
                                                    <td
                                                        className={cn('py-1.5 pr-2 font-semibold capitalize', getAllianceColorClasses(ownColor).text)}
                                                    >
                                                        {ownColor}
                                                    </td>
                                                    <td className="py-1.5 pr-2 font-mono">{teamNumbers(match, ownColor, team.id)}</td>
                                                    <td className="py-1.5 font-mono">
                                                        {colors
                                                            .filter((color) => color !== ownColor)
                                                            .map((color) => teamNumbers(match, color, team.id))
                                                            .join(' / ')}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </section>
                    );
                })}
            </div>
        </PrintLayout>
    );
}
