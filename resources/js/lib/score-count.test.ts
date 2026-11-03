import { applyScoreCount, countScores } from '@/lib/score-count';
import type { CompetitionMatch, ScoreType } from '@/types';
import { describe, expect, it } from 'vitest';

const type = (id: number, points: number, kind: ScoreType['kind'] = 'count', choiceSet: string | null = null) =>
    ({ id, name: `type ${id}`, points, target: 'team', kind, choice_set: choiceSet, group_id: null }) as ScoreType;

const artifact = type(1, 3);
const partial = type(2, 5, 'choice', 'Base');
const full = type(3, 10, 'choice', 'Base');
const leave = type(4, 3, 'toggle');
const scoreTypes = [artifact, partial, full, leave];

const match = {
    id: 7,
    match_alliances: [{ id: 1, score: 0, team: { id: 11 }, alliance: { id: 1, color: 'red' } }],
    scores: [],
} as unknown as CompetitionMatch;

const robot = { teamId: 11 };

describe('applyScoreCount', () => {
    it('adds and removes scores to reach the count and keeps the robot total in step', () => {
        const three = applyScoreCount(match, artifact, scoreTypes, robot, 3);
        expect(countScores(three, artifact.id, robot)).toBe(3);
        expect(three.match_alliances[0].score).toBe(9);

        const one = applyScoreCount(three, artifact, scoreTypes, robot, 1);
        expect(countScores(one, artifact.id, robot)).toBe(1);
        expect(one.match_alliances[0].score).toBe(3);
    });

    it('counts a yes/no score type at most once and swaps "one of" options', () => {
        const left = applyScoreCount(match, leave, scoreTypes, robot, 5);
        expect(countScores(left, leave.id, robot)).toBe(1);

        const based = applyScoreCount(applyScoreCount(match, partial, scoreTypes, robot, 1), full, scoreTypes, robot, 1);
        expect(countScores(based, partial.id, robot)).toBe(0);
        expect(countScores(based, full.id, robot)).toBe(1);
        expect(based.match_alliances[0].score).toBe(10);
    });

    it('leaves the match untouched when the count is already right', () => {
        expect(applyScoreCount(match, artifact, scoreTypes, robot, 0)).toBe(match);
    });
});
