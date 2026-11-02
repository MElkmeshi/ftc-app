import type { CompetitionMatch } from '@/types';
import { describe, expect, it } from 'vitest';
import { getAllianceScore } from './match-utils';

function makeMatch(points: number | undefined): CompetitionMatch {
    return {
        id: 1,
        number: 1,
        type: 'elimination',
        round: 'final',
        elimination_series_id: 1,
        start_time: '',
        started_at: null,
        duration_ms: null,
        ended_at: null,
        status: 'completed',
        match_alliances: [1, 2].map((id) => ({
            id,
            team: { id, number: String(id), name: `Team ${id}` },
            alliance: { id: 1, color: 'red' },
            alliance_group_id: 1,
            score: 50,
        })),
        scores: [
            {
                id: 1,
                match_id: 1,
                alliance_id: 1,
                team_id: null,
                points,
                score_type_id: 1,
                score_type: { id: 1, name: 'Bonus', points: 25, target: 'alliance', group_id: null },
                created_at: '',
            },
            { id: 2, match_id: 1, team_id: 1, alliance_id: 1, points: 50, score_type_id: null, created_at: '' },
            { id: 3, match_id: 1, team_id: null, alliance_id: 2, points: 999, score_type_id: 1, created_at: '' },
        ],
    };
}

describe('alliance score totals', () => {
    it.each([10, 0, -10])('counts a %i point snapshot once and excludes team history and opposing scores', (points) => {
        expect(getAllianceScore(makeMatch(points), 'red')).toBe(100 + points);
    });

    it('supports older payloads without point snapshots', () => {
        expect(getAllianceScore(makeMatch(undefined), 'red')).toBe(125);
    });
});
