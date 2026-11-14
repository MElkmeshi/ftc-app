import { type AwardKind, type Team } from '@/types';

export type AwardTeam = Pick<Team, 'id' | 'number' | 'name'> & { city?: string | null };

export interface AwardWinnerRow {
    id: number;
    place: number;
    recipient: string | null;
    comment: string | null;
    team: AwardTeam | null;
}

export interface AwardRow {
    id: number;
    name: string;
    description: string | null;
    is_team_award: boolean;
    kind?: AwardKind | null;
    places: number;
    winners: AwardWinnerRow[];
}

export interface AwardSlot {
    place: number;
    winner: AwardWinnerRow | null;
}

const SLOT_LABELS = ['Winner', 'Second Place', 'Third Place', 'Runner Up'];

const ALLIANCE_SLOT_LABELS = ['Captain', 'First Pick', 'Second Pick'];

/**
 * An alliance's award names its slots after the alliance's teams instead
 * of places.
 */
export function slotLabel(place: number, kind?: AwardKind | null): string {
    const labels = kind ? ALLIANCE_SLOT_LABELS : SLOT_LABELS;

    return labels[Math.min(place, labels.length) - 1] ?? labels[0];
}

export function slotsOf(award: AwardRow): AwardSlot[] {
    return Array.from({ length: award.places }, (_, index) => ({
        place: index + 1,
        winner: award.winners.find((winner) => winner.place === index + 1) ?? null,
    }));
}

function isFilled(winner: AwardWinnerRow | null): winner is AwardWinnerRow {
    return winner !== null && (winner.team !== null || Boolean(winner.recipient));
}

/**
 * The slots that were given to someone, in the order they are announced:
 * the last place first and the winner last. An alliance's award is read
 * from its captain down.
 */
export function announcedSlots(award: AwardRow): AwardWinnerRow[] {
    const given = slotsOf(award)
        .map((slot) => slot.winner)
        .filter(isFilled);

    return award.kind ? given : given.reverse();
}

function firstWinner(award: AwardRow): AwardWinnerRow | null {
    return slotsOf(award)[0]?.winner ?? null;
}

export function isAwardGiven(award: AwardRow): boolean {
    const winner = firstWinner(award);

    return winner !== null && ((award.is_team_award && winner.team !== null) || Boolean(winner.recipient));
}

export function teamLabel(team: AwardTeam): string {
    return `${team.number} - ${team.name}`;
}

export function awardSummary(award: AwardRow): string {
    const winner = firstWinner(award);

    if (winner === null || !isAwardGiven(award)) {
        return 'NOT GIVEN';
    }

    if (award.is_team_award && winner.team) {
        return `${winner.team.number} ${winner.team.name}`;
    }

    return winner.team ? `${winner.recipient} - ${winner.team.number} ${winner.team.name}` : (winner.recipient ?? '');
}

export function winnerText(award: AwardRow, winner: AwardWinnerRow): string {
    if (winner.team && (award.is_team_award || !winner.recipient)) {
        return teamLabel(winner.team);
    }

    return `${winner.recipient ?? ''}${winner.team ? ` (${winner.team.number})` : ''}`.trim();
}
