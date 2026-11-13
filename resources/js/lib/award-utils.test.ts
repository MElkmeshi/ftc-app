import { announcedSlots, type AwardRow, awardSummary, type AwardWinnerRow, isAwardGiven, slotLabel, slotsOf, winnerText } from '@/lib/award-utils';
import { describe, expect, it } from 'vitest';

const HACKSAW = { id: 1, number: '1001', name: 'Hacksaw' };

function winner(place: number, overrides: Partial<AwardWinnerRow> = {}): AwardWinnerRow {
    return { id: place, place, recipient: null, comment: null, team: HACKSAW, ...overrides };
}

function award(overrides: Partial<AwardRow> = {}): AwardRow {
    return { id: 1, name: 'Design Award', description: null, is_team_award: true, places: 1, winners: [], ...overrides };
}

describe('slot labels', () => {
    it('names the first three slots and calls every later one a runner up', () => {
        expect([1, 2, 3, 4, 9].map(slotLabel)).toEqual(['Winner', 'Second Place', 'Third Place', 'Runner Up', 'Runner Up']);
    });
});

describe('slots', () => {
    it('lists every slot of the award, filled or not, and ignores winners beyond them', () => {
        const slots = slotsOf(award({ places: 2, winners: [winner(2), winner(3)] }));

        expect(slots.map((slot) => [slot.place, slot.winner?.id ?? null])).toEqual([
            [1, null],
            [2, 2],
        ]);
    });

    it('announces only the given slots, the last place first', () => {
        const announced = announcedSlots(award({ places: 4, winners: [winner(1), winner(2, { team: null, comment: 'Only a comment' }), winner(4)] }));

        expect(announced.map((slot) => slot.place)).toEqual([4, 1]);
    });
});

describe('whether an award is given', () => {
    it('is given once the winner slot of a team award has a team', () => {
        expect(isAwardGiven(award())).toBe(false);
        expect(isAwardGiven(award({ winners: [winner(2)], places: 2 }))).toBe(false);
        expect(isAwardGiven(award({ winners: [winner(1)] }))).toBe(true);
    });

    it('needs a name, not just a team, when the award goes to a person', () => {
        expect(isAwardGiven(award({ is_team_award: false, winners: [winner(1)] }))).toBe(false);
        expect(isAwardGiven(award({ is_team_award: false, winners: [winner(1, { team: null, recipient: 'Sam Rivera' })] }))).toBe(true);
    });
});

describe('what the awards list shows under the name', () => {
    it.each([
        ['nothing entered', award(), 'NOT GIVEN'],
        ['a team award', award({ winners: [winner(1)] }), '1001 Hacksaw'],
        ['a person', award({ is_team_award: false, winners: [winner(1, { team: null, recipient: 'Sam Rivera' })] }), 'Sam Rivera'],
        ['a person on a team', award({ is_team_award: false, winners: [winner(1, { recipient: 'Sam Rivera' })] }), 'Sam Rivera - 1001 Hacksaw'],
    ])('%s', (_case, row, expected) => {
        expect(awardSummary(row)).toBe(expected);
    });
});

describe('how a winner is written on the presentation list', () => {
    it('writes a team as number and name, and a person with their team number', () => {
        expect(winnerText(award(), winner(1))).toBe('1001 - Hacksaw');
        expect(winnerText(award({ is_team_award: false }), winner(1, { recipient: 'Sam Rivera' }))).toBe('Sam Rivera (1001)');
        expect(winnerText(award({ is_team_award: false }), winner(1, { team: null, recipient: 'Sam Rivera' }))).toBe('Sam Rivera');
    });
});
