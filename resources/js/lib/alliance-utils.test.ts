import { allianceTeams, canInvite, isSelectionComplete, pickingGroup, pickLabels, roundCode, roundLabel } from '@/lib/alliance-utils';
import { type AllianceGroup, type Team } from '@/types';
import { describe, expect, it } from 'vitest';

function team(id: number): Team {
    return { id, number: String(id), name: `Team ${id}` } as Team;
}

function group(seed: number, overrides: Partial<AllianceGroup> = {}): AllianceGroup {
    return { id: seed, seed, size: 2, captain_team: team(seed), picked_team: null, second_picked_team: null, pending_team: null, ...overrides };
}

describe('whose turn it is to pick', () => {
    it('goes through the alliances in seed order', () => {
        expect(pickingGroup([group(1, { picked_team: team(10) }), group(2), group(3)])?.seed).toBe(2);
    });

    it('starts a second round from the first alliance when alliances have three teams', () => {
        const groups = [group(1, { size: 3, picked_team: team(10) }), group(2, { size: 3, picked_team: team(11) })];

        expect(pickingGroup(groups)?.seed).toBe(1);
        expect(isSelectionComplete(groups)).toBe(false);
    });

    it('is over once every alliance is full', () => {
        const groups = [group(1, { picked_team: team(10) }), group(2, { picked_team: team(11) })];

        expect(pickingGroup(groups)).toBeUndefined();
        expect(isSelectionComplete(groups)).toBe(true);
        expect(isSelectionComplete([])).toBe(false);
    });
});

describe('who can be invited', () => {
    const groups = [group(1), group(2), group(3, { picked_team: team(30) })];
    const none = new Set<number>();

    it.each([
        ['a team in no alliance', 50, true],
        ['the captain of a lower alliance that has not picked', 2, true],
        ['the captain of a lower alliance that already picked', 3, false],
        ['its own captain', 1, false],
        ['a team another alliance picked', 30, false],
    ])('%s', (_case, teamId, expected) => {
        expect(canInvite(teamId, groups[0], groups, none)).toBe(expected);
    });

    it('never lets a lower alliance invite a higher captain', () => {
        expect(canInvite(1, groups[1], groups, none)).toBe(false);
    });

    it('leaves out a team that declined, and everyone once selection is complete', () => {
        expect(canInvite(50, groups[0], groups, new Set([50]))).toBe(false);
        expect(canInvite(50, undefined, groups, none)).toBe(false);
    });
});

describe('alliance teams and columns', () => {
    it('lists the captain and its picks in order', () => {
        const full = group(1, { size: 3, picked_team: team(10), second_picked_team: team(20) });

        expect(allianceTeams(full).map((member) => member.id)).toEqual([1, 10, 20]);
        expect(allianceTeams(group(2)).map((member) => member.id)).toEqual([2]);
    });

    it('shows one Partner column for two-team alliances and two pick columns for three', () => {
        expect(pickLabels([group(1)])).toEqual(['Partner']);
        expect(pickLabels([group(1, { size: 3 })])).toEqual(['1st Pick', '2nd Pick']);
    });
});

describe('round names', () => {
    it.each([
        ['quarterfinal_3', 'Quarterfinal 3', 'QF3'],
        ['semifinal_1', 'Semifinal 1', 'SF1'],
        ['final', 'Final', ''],
        ['tiebreaker_quarterfinal_2', 'Tiebreaker QF2', 'QF2'],
        ['tiebreaker_final', 'Tiebreaker Final', ''],
    ])('%s', (round, label, code) => {
        expect(roundLabel(round)).toBe(label);
        expect(roundCode(round)).toBe(code);
    });
});
