import { DISPLAY_COLORS, EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { useAllianceGroups, useAllianceSelectionEcho, useAllianceSelectionRankings, useDeclinedTeams } from '@/hooks/use-alliance-selection';
import { type AllianceGroup, type TeamDisplay } from '@/types';
import { Head } from '@inertiajs/react';

const TEAMS_PER_COLUMN = 10;
const PICKING_COLOR = '#f57e25';

function selectionStatus(groups: AllianceGroup[]): string {
    const pending = groups.find((group) => group.pending_team !== null);
    const picking = groups.find((group) => group.picked_team === null);

    if (groups.length === 0) {
        return 'Waiting for alliance selection to begin';
    }

    if (pending) {
        return `Alliance #${pending.seed} invited #${pending.pending_team?.number}`;
    }

    return picking ? `Alliance #${picking.seed} is picking` : 'All alliances formed';
}

function AllianceTable({ groups }: { groups: AllianceGroup[] }) {
    const pickingSeed = groups.find((group) => group.picked_team === null)?.seed;
    const rows =
        groups.length > 0 ? groups : [1, 2, 3, 4].map((seed) => ({ id: seed, seed, captain_team: null, picked_team: null, pending_team: null }));

    return (
        <div className="absolute text-black" style={{ left: vw(13), top: vh(60), width: vw(454) }}>
            <div className="flex text-white" style={{ height: vh(44), fontSize: vh(24), paddingLeft: vw(32) }}>
                <span className="flex-1 text-center">Captain</span>
                <span className="flex-1 text-center">Partner</span>
            </div>
            {rows.map((group) => (
                <div key={group.id} className="flex bg-white" style={{ height: vh(50), marginBottom: vh(6.5), fontSize: vh(30) }}>
                    <span
                        className="flex items-center justify-center"
                        style={{ width: vw(32), backgroundColor: group.seed === pickingSeed ? PICKING_COLOR : DISPLAY_COLORS.tan }}
                    >
                        {group.seed}
                    </span>
                    <span className="flex flex-1 items-center" style={{ paddingLeft: vw(40) }}>
                        {group.captain_team?.number}
                    </span>
                    <span className="flex flex-1 items-center" style={{ paddingLeft: vw(40), color: group.picked_team ? undefined : PICKING_COLOR }}>
                        {group.picked_team?.number ?? group.pending_team?.number}
                    </span>
                </div>
            ))}
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
    const takenIds = new Set([
        ...declinedTeams.map((team) => team.id),
        ...groups.flatMap((group) => [group.captain_team.id, ...(group.picked_team ? [group.picked_team.id] : [])]),
    ]);

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
