import { DISPLAY_COLORS, EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { useAllianceGroups, useAllianceSelectionEcho, useAllianceSelectionRankings, useDeclinedTeams } from '@/hooks/use-alliance-selection';
import { allianceTeams, hasThirdTeam, pickingGroup, pickLabels } from '@/lib/alliance-utils';
import { type AllianceGroup, type TeamDisplay } from '@/types';
import { Head } from '@inertiajs/react';

const TEAMS_PER_COLUMN = 10;
const PICKING_COLOR = '#f57e25';

function selectionStatus(groups: AllianceGroup[]): string {
    const pending = groups.find((group) => group.pending_team !== null);
    const picking = pickingGroup(groups);

    if (groups.length === 0) {
        return 'Waiting for alliance selection to begin';
    }

    if (pending) {
        return `Alliance #${pending.seed} invited #${pending.pending_team?.number}`;
    }

    return picking ? `Alliance #${picking.seed} is picking` : 'All alliances formed';
}

function AllianceTable({ groups }: { groups: AllianceGroup[] }) {
    const picking = pickingGroup(groups);
    const labels = pickLabels(groups);
    const cellPadding = vw(hasThirdTeam(groups) ? 14 : 40);
    const rows =
        groups.length > 0
            ? groups
            : [1, 2, 3, 4].map((seed) => ({ id: seed, seed, captain_team: null, picked_team: null, second_picked_team: null, pending_team: null }));

    return (
        <div className="absolute text-black" style={{ left: vw(13), top: vh(60), width: vw(454) }}>
            <div className="flex text-white" style={{ height: vh(44), fontSize: vh(24), paddingLeft: vw(32) }}>
                <span className="flex-1 text-center">Captain</span>
                {labels.map((label) => (
                    <span key={label} className="flex-1 text-center">
                        {label}
                    </span>
                ))}
            </div>
            {rows.map((group) => {
                const picks = [group.picked_team, group.second_picked_team ?? null].slice(0, labels.length);
                const openIndex = picks.findIndex((team) => team === null);

                return (
                    <div key={group.id} className="flex bg-white" style={{ height: vh(50), marginBottom: vh(6.5), fontSize: vh(30) }}>
                        <span
                            className="flex items-center justify-center"
                            style={{ width: vw(32), backgroundColor: group.id === picking?.id ? PICKING_COLOR : DISPLAY_COLORS.tan }}
                        >
                            {group.seed}
                        </span>
                        <span className="flex flex-1 items-center" style={{ paddingLeft: cellPadding }}>
                            {group.captain_team?.number}
                        </span>
                        {picks.map((team, index) => (
                            <span
                                key={index}
                                className="flex flex-1 items-center"
                                style={{ paddingLeft: cellPadding, color: team ? undefined : PICKING_COLOR }}
                            >
                                {team?.number ?? (index === openIndex ? group.pending_team?.number : undefined)}
                            </span>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function TeamList({ teams, takenIds }: { teams: TeamDisplay[]; takenIds: Set<number> }) {
    const columns: TeamDisplay[][] = [];

    teams.forEach((team, index) => {
        const column = Math.floor(index / TEAMS_PER_COLUMN);
        columns[column] = [...(columns[column] ?? []), team];
    });

    return (
        <div className="absolute flex text-black" style={{ left: vw(586), top: vh(20), gap: vw(120), fontSize: vh(34) }}>
            {columns.map((column, columnIndex) => (
                <div key={columnIndex}>
                    {column.map((team, index) => {
                        const taken = takenIds.has(team.team_id);

                        return (
                            <div key={team.team_id} className="flex" style={{ height: vh(44), marginBottom: vh(5.7) }}>
                                <span
                                    className="flex items-center justify-center"
                                    style={{ width: vw(66), backgroundColor: taken ? '#b3bcc4' : DISPLAY_COLORS.tan }}
                                >
                                    {columnIndex * TEAMS_PER_COLUMN + index + 1}
                                </span>
                                <span
                                    className={`flex items-center bg-white ${taken ? 'line-through' : ''}`}
                                    style={{ padding: `0 ${vw(6)}`, minWidth: vw(84) }}
                                >
                                    {team.team_number}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
}

export function AllianceSelectionScreen() {
    useAllianceSelectionEcho();

    const { data: rankings = [] } = useAllianceSelectionRankings(30000);
    const { data: groups = [] } = useAllianceGroups(15000);
    const { data: declinedTeams = [] } = useDeclinedTeams();
    const takenIds = new Set([...declinedTeams.map((team) => team.id), ...groups.flatMap((group) => allianceTeams(group).map((team) => team.id))]);

    return (
        <Stage>
            <Head title="Alliance Selection" />
            <p role="status" className="sr-only">
                {selectionStatus(groups)}
            </p>
            <AllianceTable groups={groups} />
            <TeamList teams={rankings} takenIds={takenIds} />
            <EventBar />
        </Stage>
    );
}
