import type { CompetitionMatch, ScoreType } from '@/types';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({
    setScoreCount: vi.fn(async () => ({})),
    commitUnplayedMatch: vi.fn(async () => ({})),
    setAudienceDisplay: vi.fn(async () => ({})),
}));

const page = vi.hoisted(() => ({ match: null as unknown, scoreTypes: [] as unknown[] }));

vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
    router: { reload: vi.fn(), visit: vi.fn() },
    usePage: () => ({ props: { scoreTypes: page.scoreTypes } }),
    useProp: () => ({ value: page.match }),
}));

const { default: MatchScoreEdit } = await import('@/pages/matches/edit');

function scoreType(id: number, name: string, overrides: Partial<ScoreType>): ScoreType {
    return {
        id,
        name,
        points: 5,
        target: 'alliance',
        kind: 'count',
        choice_set: null,
        referee: 'scoring',
        awarded_to: 'own',
        group_id: null,
        ...overrides,
    };
}

const PARKED = scoreType(1, 'parked', { kind: 'toggle', target: 'team' });
const LOW = scoreType(2, 'low_hang', { kind: 'choice', choice_set: 'Hang' });
const HIGH = scoreType(3, 'high_hang', { kind: 'choice', choice_set: 'Hang' });

function makeMatch(scores: { score_type_id: number; team_id: number | null; alliance_id: number }[]): CompetitionMatch {
    return {
        id: 7,
        number: 1,
        type: 'qualification',
        round: null,
        status: 'completed',
        match_alliances: [
            { id: 1, score: 0, team: { id: 11, number: '100' }, alliance: { id: 1, color: 'red' } },
            { id: 2, score: 0, team: { id: 12, number: '200' }, alliance: { id: 2, color: 'blue' } },
        ],
        scores: scores.map((score, index) => ({ id: index + 1, match_id: 7, ...score })),
    } as unknown as CompetitionMatch;
}

function redRow(name: RegExp): HTMLElement {
    return screen.getAllByRole('row', { name })[0];
}

describe('score edit', () => {
    beforeEach(() => {
        api.setScoreCount.mockClear();
        page.scoreTypes = [PARKED, LOW, HIGH];
    });

    it('saves a yes/no score type as one or zero for the robot', async () => {
        page.match = makeMatch([]);
        render(<MatchScoreEdit />);

        fireEvent.click(within(redRow(/parked/i)).getByRole('checkbox'));

        await waitFor(() => expect(api.setScoreCount).toHaveBeenCalledWith({ match_id: 7, score_type_id: PARKED.id, count: 1, team_id: 11 }));
    });

    it('clears a ticked yes/no score type', async () => {
        page.match = makeMatch([{ score_type_id: PARKED.id, team_id: 11, alliance_id: 1 }]);
        render(<MatchScoreEdit />);

        const checkbox = within(redRow(/parked/i)).getByRole('checkbox');
        expect(checkbox).toBeChecked();
        fireEvent.click(checkbox);

        await waitFor(() => expect(api.setScoreCount).toHaveBeenCalledWith({ match_id: 7, score_type_id: PARKED.id, count: 0, team_id: 11 }));
    });

    it('clears the other option of a "one of" set before choosing a new one', async () => {
        page.match = makeMatch([{ score_type_id: LOW.id, team_id: null, alliance_id: 1 }]);
        render(<MatchScoreEdit />);

        fireEvent.click(within(redRow(/high hang/i)).getByRole('checkbox'));

        await waitFor(() => expect(api.setScoreCount).toHaveBeenCalledTimes(2));
        expect(api.setScoreCount.mock.calls).toEqual([
            [{ match_id: 7, score_type_id: LOW.id, count: 0, alliance_id: 1 }],
            [{ match_id: 7, score_type_id: HIGH.id, count: 1, alliance_id: 1 }],
        ]);
    });
});
