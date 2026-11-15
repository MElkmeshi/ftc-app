import {
    autoAssignTeams,
    boundingBox,
    CellType,
    fitZoom,
    intersects,
    mergeTeamsAndPits,
    nextQuickAddress,
    nextZoom,
    parseImport,
    type PitObject,
    renumberPits,
    setPitTeam,
    swapPitNumber,
} from '@/lib/pit-map';
import { describe, expect, it } from 'vitest';

const pit = (label: string, x: number, extra: Partial<PitObject> = {}): PitObject => ({ type: CellType.PIT, x, y: 0, w: 2, h: 2, label, ...extra });

describe('pit numbers', () => {
    it('swaps two pit numbers and leaves the team, address and color where they stand', () => {
        const first = pit('1', 0, { team: 100, address: 'A1', color: '#112233' });
        const second = pit('2', 2, { team: 200 });
        const objects = [first, second];

        expect(swapPitNumber(objects, second, '1')).toBeNull();

        expect(objects.find((object) => object.label === '1')).toMatchObject({ x: 2, team: 200 });
        expect(objects.find((object) => object.label === '1')).not.toHaveProperty('address');
        expect(objects.find((object) => object.label === '2')).toMatchObject({ x: 0, team: 100, address: 'A1', color: '#112233' });
    });

    it('refuses a number no pit has', () => {
        const objects = [pit('1', 0), pit('2', 2)];

        expect(swapPitNumber(objects, objects[0], '9')).toEqual({ kind: 'illegal-number', number: '9', max: 2 });
        expect(objects.map((object) => object.x)).toEqual([0, 2]);
    });

    it('numbers pits in drawing order and skips other objects', () => {
        const objects: PitObject[] = [pit('7', 0), { type: CellType.BOUNDARY, x: 0, y: 5, w: 4, h: 1 }, pit('3', 2)];

        renumberPits(objects);

        expect(objects.map((object) => object.label)).toEqual(['1', undefined, '2']);
    });
});

describe('quick addresses', () => {
    it('starts a prefix at the increment and continues from the highest one', () => {
        expect(nextQuickAddress([pit('1', 0)], 'A', 1)).toBe('A1');
        expect(nextQuickAddress([pit('1', 0, { address: 'A1' }), pit('2', 2, { address: 'A4' }), pit('3', 4, { address: 'B9' })], 'A', 2)).toBe('A6');
    });

    it('keeps the leading zero below ten', () => {
        expect(nextQuickAddress([pit('1', 0, { address: 'A08' })], 'A', 1)).toBe('A09');
        expect(nextQuickAddress([pit('1', 0, { address: 'A09' })], 'A', 1)).toBe('A10');
    });
});

describe('team assignment', () => {
    it('fills free pits by pit number with the teams that have no pit yet', () => {
        const objects = [pit('2', 2), pit('1', 0), pit('3', 4, { team: 30 })];

        autoAssignTeams(objects, [30, 20, 10], 'ascending');

        expect(objects.map((object) => [object.label, object.team])).toEqual([
            ['2', 20],
            ['1', 10],
            ['3', 30],
        ]);
    });

    it('assigns the highest team first when descending and stops when pits run out', () => {
        const objects = [pit('1', 0)];

        autoAssignTeams(objects, [10, 20, 30], 'descending');

        expect(objects[0].team).toBe(30);
    });

    it('clears the team for anything that is not a team number', () => {
        const target = pit('1', 0, { team: 10 });

        setPitTeam(target, 'abc');

        expect(target).not.toHaveProperty('team');
    });

    it('lists every team with its pit and flags a pit team that is not at the event', () => {
        const rows = mergeTeamsAndPits(
            [
                { number: 10, name: 'Ten' },
                { number: 20, name: 'Twenty' },
            ],
            [pit('1', 0, { team: 20, address: 'B2' }), pit('2', 2, { team: 99 })],
        );

        expect(rows).toEqual([
            { number: 10, name: 'Ten', notPresent: false, pit: '', address: '' },
            { number: 20, name: 'Twenty', notPresent: false, pit: '1', address: 'B2' },
            { number: 99, name: 'Not at Event', notPresent: true, pit: '2', address: '' },
        ]);
    });
});

describe('geometry and zoom', () => {
    it('measures the box around every object', () => {
        expect(boundingBox([pit('1', 3), { type: CellType.FIELD, x: -1, y: 4, w: 5, h: 3 }])).toEqual({ x: -1, y: 0, w: 6, h: 7 });
        expect(boundingBox([])).toEqual({ x: 0, y: 0, w: 0, h: 0 });
    });

    it('treats a cell as inside the object that covers it', () => {
        expect(intersects({ x: 1, y: 1, w: 0, h: 0 }, { x: 0, y: 0, w: 2, h: 2 })).toBe(true);
        expect(intersects({ x: 2, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 2, h: 2 })).toBe(false);
    });

    it('zooms in tenths below 100% and quarters above, never under 25%', () => {
        expect(nextZoom(1, 'in')).toBe(1.25);
        expect(nextZoom(1, 'out')).toBeCloseTo(0.9);
        expect(nextZoom(0.3, 'out')).toBe(0.25);
        expect(nextZoom(1.5, 'out')).toBe(1.25);
    });

    it('shrinks a wide map until it fits', () => {
        expect(fitZoom(1200, 30)).toBe(1);
        expect(fitZoom(310, 30)).toBeCloseTo(0.5);
        expect(fitZoom(10, 300)).toBe(0.25);
    });
});

describe('import', () => {
    it('reads an FTC Live pit map file whether objects are a list or a string', () => {
        const objects = [pit('1', 0)];

        expect(parseImport(JSON.stringify({ objects }))).toEqual(objects);
        expect(parseImport(JSON.stringify({ objects: JSON.stringify(objects) }))).toEqual(objects);
    });

    it('rejects a file that is not a pit map', () => {
        expect(parseImport('not json')).toBeNull();
        expect(parseImport('{"teams":[]}')).toBeNull();
    });
});
