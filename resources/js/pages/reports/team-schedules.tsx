import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { formatMatchTime, getFieldLabel, getMatchTitle, teamNumberLabel } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

function teamNumbers(match: CompetitionMatch, color: string, except: number): string {
    return membersOf(match, color)
        .filter((matchAlliance) => matchAlliance.team?.id !== except)
        .map((matchAlliance) => teamNumberLabel(matchAlliance))
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
            title={`${event?.name ?? ''} Team Match Schedules`}
            toolbar={
                <select aria-label="Team" className={bs.formSelect} value={teamId} onChange={(changeEvent) => setTeamId(changeEvent.target.value)}>
                    <option value="">All Teams</option>
                    {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                            {team.number} {team.name}
                        </option>
                    ))}
                </select>
            }
        >
            {visibleTeams.map((team) => {
                const teamMatches = matches.filter((match) => match.match_alliances.some((matchAlliance) => matchAlliance.team?.id === team.id));

                return (
                    <ReportRow key={team.id} className="break-after-page">
                        <h3 className={cn(bs.h3, 'w-full text-center')}>
                            Team {team.number} {team.name}
                        </h3>
                        <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                            <thead>
                                <tr>
                                    <th scope="col">Match</th>
                                    <th scope="col">Start Time</th>
                                    <th scope="col">Alliance</th>
                                    <th scope="col">Partners</th>
                                    <th scope="col">Opponents</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamMatches.map((match) => {
                                    const colors = allianceColorsOf(match);
                                    const ownColor =
                                        match.match_alliances.find((matchAlliance) => matchAlliance.team?.id === team.id)?.alliance.color ?? '';

                                    return (
                                        <tr key={match.id}>
                                            <td>{getMatchTitle(match)}</td>
                                            <td>
                                                {[formatMatchTime(match.start_time, event?.timezone), getFieldLabel(match, event?.field_count ?? 1)]
                                                    .filter(Boolean)
                                                    .join(' ')}
                                            </td>
                                            <td className="capitalize">{ownColor}</td>
                                            <td>{teamNumbers(match, ownColor, team.id)}</td>
                                            <td>
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
                    </ReportRow>
                );
            })}
        </PrintLayout>
    );
}
