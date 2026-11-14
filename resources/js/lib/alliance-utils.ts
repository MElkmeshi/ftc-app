import { type AllianceGroup, type Team } from '@/types';

type GroupPicks = Pick<AllianceGroup, 'picked_team' | 'second_picked_team' | 'size'>;

const ROUND_NAMES: Record<string, string> = { quarterfinal: 'Quarterfinal', semifinal: 'Semifinal', final: 'Final' };
const ROUND_CODES: Record<string, string> = { quarterfinal: 'QF', semifinal: 'SF' };

export function hasOpenPick(group: GroupPicks): boolean {
    return group.picked_team === null || ((group.size ?? 2) > 2 && !group.second_picked_team);
}

/**
 * The alliance whose turn it is: every alliance picks its first partner in
 * seed order, then, with three-team alliances, its second in the same order.
 */
export function pickingGroup<T extends GroupPicks>(groups: T[]): T | undefined {
    return groups.find((group) => group.picked_team === null) ?? groups.find(hasOpenPick);
}

export function isSelectionComplete(groups: GroupPicks[]): boolean {
    return groups.length > 0 && !groups.some(hasOpenPick);
}

export function hasThirdTeam(groups: GroupPicks[]): boolean {
    return groups.some((group) => (group.size ?? 2) > 2);
}

export function allianceTeams(group: Pick<AllianceGroup, 'captain_team' | 'picked_team' | 'second_picked_team'>): Team[] {
    return [group.captain_team, group.picked_team, group.second_picked_team ?? null].filter((team) => team !== null);
}

/**
 * Whether the picking alliance may invite this team: any team that is not in
 * an alliance, or the captain of a lower alliance that has not picked yet.
 */
export function canInvite(teamId: number, picking: AllianceGroup | undefined, groups: AllianceGroup[], declinedIds: Set<number>): boolean {
    if (!picking || declinedIds.has(teamId)) {
        return false;
    }

    const captained = groups.find((group) => group.captain_team.id === teamId);

    if (captained) {
        return captained.seed > picking.seed && captained.picked_team === null;
    }

    return !groups.some((group) => [group.picked_team?.id, group.second_picked_team?.id, group.pending_team?.id].includes(teamId));
}

export function pickLabels(groups: GroupPicks[]): string[] {
    return hasThirdTeam(groups) ? ['1st Pick', '2nd Pick'] : ['Partner'];
}

function splitRound(round: string): { tiebreaker: boolean; stage: string; number: string } {
    const [, tiebreaker, stage, number] = round.match(/^(tiebreaker_)?([a-z]+)(?:_(\d+))?$/) ?? [];

    return { tiebreaker: Boolean(tiebreaker), stage: stage ?? round, number: number ?? '' };
}

export function roundCode(round: string): string {
    const { stage, number } = splitRound(round);

    return `${ROUND_CODES[stage] ?? ''}${number}`;
}

export function roundLabel(round: string): string {
    const { tiebreaker, stage, number } = splitRound(round);

    if (!ROUND_NAMES[stage]) {
        return round;
    }

    if (tiebreaker) {
        return `Tiebreaker ${stage === 'final' ? 'Final' : roundCode(round)}`;
    }

    return `${ROUND_NAMES[stage]}${number ? ` ${number}` : ''}`;
}
