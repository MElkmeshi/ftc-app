import type { CompetitionMatch } from '@/types';
import { describe, expect, it } from 'vitest';
import { getAllianceBreakdown, getAllianceScore, getMatchTitle, scheduleDriftMinutes } from './match-utils';

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

describe('score breakdown', () => {
    const groups = [
        { id: 10, name: 'Teleop', description: null, display_order: 2 },
        { id: 20, name: 'Autonomous', description: null, display_order: 1 },
    ];

    function scoredMatch(teamScore: number): CompetitionMatch {
        const score = (id: number, groupId: number | null, points: number, teamId: number | null) => ({
            id,
            match_id: 1,
            alliance_id: 1,
            team_id: teamId,
            points,
            score_type_id: id,
            score_type: { id, name: `Type ${id}`, points, target: (teamId ? 'team' : 'alliance') as 'team' | 'alliance', group_id: groupId },
            created_at: '',
        });

        return {
            ...makeMatch(0),
            match_alliances: [
                { id: 1, team: { id: 1, number: '1', name: 'Team 1' }, alliance: { id: 1, color: 'red' }, alliance_group_id: null, score: teamScore },
            ],
            scores: [score(1, 10, 5, 1), score(2, 20, 3, 1), score(3, 10, 2, null)],
        };
    }

    it('groups points in display order', () => {
        expect(getAllianceBreakdown(scoredMatch(8), 'red', groups)).toEqual([
            { label: 'Autonomous', points: 3 },
            { label: 'Teleop', points: 7 },
        ]);
    });

    it('shows manual corrections as an adjustment so lines add up to the total', () => {
        expect(getAllianceBreakdown(scoredMatch(10), 'red', groups).at(-1)).toEqual({ label: 'Adjustment', points: 2 });
    });
});

describe('match titles', () => {
    it('names qualification and playoff matches', () => {
        expect(getMatchTitle({ number: 12, type: 'qualification', round: null })).toBe('Qualification 12');
        expect(getMatchTitle({ number: 2, type: 'elimination', round: 'semifinal_1' })).toBe('Semifinal 1 · Match 2');
        expect(getMatchTitle({ number: 7, type: 'elimination', round: 'tiebreaker_final' })).toBe('Tiebreaker Final · Match 7');
    });
});

describe('schedule drift', () => {
    const at = (iso: string) => new Date(iso).getTime();
    const match = (id: number, status: string, start: string, startedAt: string | null = null): CompetitionMatch => ({
        ...makeMatch(0),
        id,
        status,
        start_time: start,
        started_at: startedAt,
    });

    it('measures the running match against its planned time', () => {
        const matches = [match(1, 'completed', '2026-12-01T09:00:00Z'), match(2, 'ongoing', '2026-12-01T09:07:00Z', '2026-12-01T09:12:00Z')];

        expect(scheduleDriftMinutes(matches, at('2026-12-01T09:13:00Z'))).toBe(5);
    });

    it('shows being ahead when the next match could start early', () => {
        const matches = [match(1, 'completed', '2026-12-01T09:00:00Z'), match(2, 'upcoming', '2026-12-01T09:07:00Z')];

        expect(scheduleDriftMinutes(matches, at('2026-12-01T09:04:00Z'))).toBe(-3);
    });

    it('says nothing before the first match is played', () => {
        expect(scheduleDriftMinutes([match(1, 'upcoming', '2026-12-01T09:00:00Z')], at('2026-11-30T20:00:00Z'))).toBeNull();
    });
});
