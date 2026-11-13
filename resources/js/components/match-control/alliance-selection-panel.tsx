import {
    useAcceptPick,
    useAllianceGroups,
    useAllianceSelectionEcho,
    useAllianceSelectionRankings,
    useDeclinedTeams,
    useDeclinePick,
    useInviteTeam,
    useResetAllianceSelection,
    useStartAllianceSelection,
} from '@/hooks/use-alliance-selection';
import { useApi } from '@/hooks/use-api';
import {
    useCheckSeriesWinner,
    useEliminationBracket,
    useGenerateElimination,
    useGenerateTiebreaker,
    useResetElimination,
} from '@/hooks/use-elimination';
import { getApiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { type AllianceGroup, type CompetitionMatch, type EliminationSeries, type TeamDisplay } from '@/types';
import { useState } from 'react';

const buttonClass = 'rounded-md border px-3 py-1.5 text-lg leading-tight disabled:opacity-65';
const greenButtonClass = cn(buttonClass, 'border-[#198754] bg-[#198754] text-white hover:bg-[#157347]');
const greyButtonClass = cn(buttonClass, 'border-[#adb5bd] bg-[#adb5bd] text-black hover:bg-[#c1c9d0]');
const smallButtonClass = 'rounded border px-2 py-0.5 text-base leading-tight disabled:opacity-65';
const tableClass = 'border border-white text-center [&_td]:px-2 [&_td]:py-1 [&_th]:px-2 [&_th]:py-0.5 [&_th]:font-bold';

function ApiError({ error }: { error: unknown }) {
    const message = getApiErrorMessage(error);

    if (!message) {
        return null;
    }

    return <div className="mx-auto mt-2 w-fit rounded-md border border-[#f1aeb5] bg-[#f8d7da] px-3 py-1.5 text-[#58151c]">{message}</div>;
}

function getAllianceScore(match: CompetitionMatch, color: string): number {
    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + ma.score, 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0);

    return teamScore + allianceWideScore;
}

function getRoundLabel(round: string): string {
    const labels: Record<string, string> = {
        semifinal_1: 'Semifinal 1',
        semifinal_2: 'Semifinal 2',
        final: 'Final',
        tiebreaker_semifinal_1: 'Tiebreaker SF1',
        tiebreaker_semifinal_2: 'Tiebreaker SF2',
        tiebreaker_final: 'Tiebreaker Final',
    };
    return labels[round] ?? round;
}

function AllianceTable({ groups }: { groups: AllianceGroup[] }) {
    const acceptPick = useAcceptPick();
    const declinePick = useDeclinePick();

    return (
        <>
            <table className={tableClass}>
                <thead>
                    <tr>
                        <th>Alliance</th>
                        <th>Captain</th>
                        <th>Partner</th>
                    </tr>
                </thead>
                <tbody>
                    {groups.map((group) => (
                        <tr key={group.id}>
                            <td>{group.seed}</td>
                            <td>{group.captain_team.number}</td>
                            <td>
                                {group.picked_team?.number}
                                {!group.picked_team && group.pending_team && (
                                    <span className="flex items-center justify-center gap-1">
                                        <span className="text-[#ffc107]">{group.pending_team.number}</span>
                                        <button
                                            type="button"
                                            className={cn(smallButtonClass, 'border-[#198754] bg-[#198754] text-white')}
                                            disabled={acceptPick.isPending}
                                            onClick={() => acceptPick.mutate(group.id)}
                                        >
                                            Accept
                                        </button>
                                        <button
                                            type="button"
                                            className={cn(smallButtonClass, 'border-[#dc3545] bg-[#dc3545] text-white')}
                                            disabled={declinePick.isPending}
                                            onClick={() => declinePick.mutate(group.id)}
                                        >
                                            Decline
                                        </button>
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <ApiError error={acceptPick.error ?? declinePick.error} />
        </>
    );
}

function TeamTable({ rankings, groups, declinedIds }: { rankings: TeamDisplay[]; groups: AllianceGroup[]; declinedIds: Set<number> }) {
    const inviteTeam = useInviteTeam();
    const acceptPick = useAcceptPick();
    const declinePick = useDeclinePick();
    const picking = groups.find((group) => group.picked_team === null);
    const canPick = !!picking && !picking.pending_team;
    const takenIds = new Set(groups.flatMap((group) => [group.captain_team.id, group.picked_team?.id, group.pending_team?.id]));
    const isBusy = inviteTeam.isPending || acceptPick.isPending || declinePick.isPending;

    const answer = (teamId: number, accepted: boolean) => {
        if (!picking) {
            return;
        }

        inviteTeam.mutate({ allianceGroupId: picking.id, teamId }, { onSuccess: () => (accepted ? acceptPick : declinePick).mutate(picking.id) });
    };

    return (
        <>
            <table className={tableClass}>
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Number</th>
                        <th>Name</th>
                        <th>Select</th>
                        <th>Decline</th>
                    </tr>
                </thead>
                <tbody>
                    {rankings.map((team, index) => {
                        const isAvailable = !takenIds.has(team.team_id) && !declinedIds.has(team.team_id);

                        return (
                            <tr key={team.team_id} className={cn(!isAvailable && 'text-white/40 line-through')}>
                                <td>{index + 1}</td>
                                <td>{team.team_number}</td>
                                <td className="text-left">{team.team_name}</td>
                                <td>
                                    {isAvailable && groups.length > 0 && (
                                        <button
                                            type="button"
                                            className={cn(smallButtonClass, 'border-[#198754] bg-[#198754] text-white')}
                                            disabled={!canPick || isBusy}
                                            onClick={() => answer(team.team_id, true)}
                                        >
                                            Select
                                        </button>
                                    )}
                                </td>
                                <td>
                                    {isAvailable && groups.length > 0 && (
                                        <button
                                            type="button"
                                            className={cn(smallButtonClass, 'border-[#dc3545] bg-[#dc3545] text-white')}
                                            disabled={!canPick || isBusy}
                                            onClick={() => answer(team.team_id, false)}
                                        >
                                            Decline
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            <ApiError error={inviteTeam.error ?? acceptPick.error ?? declinePick.error} />
        </>
    );
}

function SeriesTable({ series }: { series: EliminationSeries[] }) {
    const checkWinner = useCheckSeriesWinner();
    const generateTiebreaker = useGenerateTiebreaker();
    const alliance = (group: AllianceGroup) => `${group.seed}: ${group.captain_team.number}, ${group.picked_team?.number ?? ''}`;

    return (
        <table className={cn(tableClass, 'mx-auto mt-4')}>
            <thead>
                <tr>
                    <th>Series</th>
                    <th>Alliance</th>
                    <th>Wins</th>
                    <th>Alliance</th>
                    <th>Wins</th>
                    <th>Matches</th>
                    <th>Winner</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                {series.map((item) => {
                    const result = item.result;
                    const isComplete = !!result && result.completed_matches === result.total_matches;
                    const isTied = !!result && result.group_1_wins === result.group_2_wins && result.completed_matches >= 2;

                    return (
                        <tr key={item.id}>
                            <td>{getRoundLabel(item.round)}</td>
                            <td>{alliance(item.alliance_group1)}</td>
                            <td>{result?.group_1_wins ?? 0}</td>
                            <td>{alliance(item.alliance_group2)}</td>
                            <td>{result?.group_2_wins ?? 0}</td>
                            <td>{item.matches.map((match) => `${getAllianceScore(match, 'red')}-${getAllianceScore(match, 'blue')}`).join(', ')}</td>
                            <td>{item.winner ? item.winner.seed : ''}</td>
                            <td>
                                {item.status !== 'completed' && isComplete && (
                                    <span className="flex gap-1">
                                        <button
                                            type="button"
                                            className={cn(smallButtonClass, 'border-[#198754] bg-[#198754] text-white')}
                                            disabled={checkWinner.isPending}
                                            onClick={() => checkWinner.mutate(item.id)}
                                        >
                                            Check Winner
                                        </button>
                                        {isTied && (
                                            <button
                                                type="button"
                                                className={cn(smallButtonClass, 'border-[#adb5bd] bg-[#adb5bd] text-black')}
                                                disabled={generateTiebreaker.isPending}
                                                onClick={() => generateTiebreaker.mutate(item.id)}
                                            >
                                                Add Tiebreaker
                                            </button>
                                        )}
                                    </span>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export function AllianceSelectionPanel() {
    useAllianceSelectionEcho();

    const api = useApi();
    const [numberOfAlliances, setNumberOfAlliances] = useState('2');
    const { data: rankings = [] } = useAllianceSelectionRankings(30000);
    const { data: groups = [] } = useAllianceGroups(15000);
    const { data: declinedTeams = [] } = useDeclinedTeams();
    const { data: bracket } = useEliminationBracket(3000);
    const startSelection = useStartAllianceSelection();
    const resetSelection = useResetAllianceSelection();
    const generateElimination = useGenerateElimination();
    const resetElimination = useResetElimination();

    const hasGroups = groups.length > 0;
    const allPicked = hasGroups && groups.every((group) => group.picked_team !== null);
    const hasBracket = !!bracket && bracket.series.length > 0;
    const maxAlliances = rankings.length >= 8 ? 8 : rankings.length >= 4 ? 4 : 2;

    const undo = () => {
        if (hasBracket) {
            if (confirm('This deletes the playoff matches. Continue?')) {
                resetElimination.mutate();
            }

            return;
        }

        resetSelection.mutate();
    };

    return (
        <div className="text-lg text-white">
            <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                {!hasGroups && (
                    <select
                        aria-label="Number of alliances"
                        className="rounded-md border border-white bg-white px-2 py-1.5 text-black"
                        value={numberOfAlliances}
                        onChange={(e) => setNumberOfAlliances(e.target.value)}
                    >
                        {[2, 4, 8]
                            .filter((count) => count <= maxAlliances)
                            .map((count) => (
                                <option key={count} value={count}>
                                    {count} Alliances
                                </option>
                            ))}
                    </select>
                )}
                <button
                    type="button"
                    className={greenButtonClass}
                    disabled={hasGroups || rankings.length < 2 || startSelection.isPending}
                    onClick={() => startSelection.mutate(parseInt(numberOfAlliances))}
                >
                    Start Alliance Selection
                </button>
                <button type="button" className={greenButtonClass} onClick={() => api.setAudienceDisplay('alliance_selection')}>
                    Set Audience Display
                </button>
            </div>
            <ApiError error={startSelection.error ?? resetSelection.error ?? generateElimination.error ?? resetElimination.error} />

            <div className="mx-auto flex max-w-[1180px] flex-wrap items-start justify-between gap-6 px-4 pt-2">
                <div>
                    <AllianceTable groups={groups} />
                    <div className="mt-2 flex gap-4">
                        <button
                            type="button"
                            className={greyButtonClass}
                            disabled={!hasGroups || resetSelection.isPending || resetElimination.isPending}
                            onClick={undo}
                        >
                            Undo
                        </button>
                        <button
                            type="button"
                            className={greyButtonClass}
                            disabled={!allPicked || hasBracket || generateElimination.isPending}
                            onClick={() => generateElimination.mutate()}
                        >
                            Generate Matches
                        </button>
                    </div>
                </div>
                <div>
                    <TeamTable rankings={rankings} groups={groups} declinedIds={new Set(declinedTeams.map((team) => team.id))} />
                </div>
            </div>

            {hasBracket && <SeriesTable series={bracket.series} />}
        </div>
    );
}
