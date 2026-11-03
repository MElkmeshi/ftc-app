import { type CompetitionMatch } from '@/types';
import { describe, expect, it } from 'vitest';
import { presentMatch } from './use-api';

describe('presentMatch', () => {
    it('treats the empty object Laravel sends for "no match" as null', () => {
        expect(presentMatch({})).toBeNull();
        expect(presentMatch(null)).toBeNull();
    });

    it('keeps a real match', () => {
        const match = { id: 7, number: 3 } as CompetitionMatch;

        expect(presentMatch(match)).toBe(match);
    });
});
