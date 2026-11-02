import { renderWithQueryClient } from '@/test/mocks';
import type { CompetitionMatch } from '@/types';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const echo = vi.hoisted(() => {
    const handlers = new Map<string, (payload: unknown) => void>();
    return {
        useEchoPublic: (channel: string, event: string, callback: (payload: unknown) => void) => {
            handlers.set(`${channel}:${event}`, callback);
        },
        emit: (channel: string, event: string, payload: unknown) => handlers.get(`${channel}:${event}`)?.(payload),
    };
});
const api = vi.hoisted(() => ({ getMatch: vi.fn(), getMatches: vi.fn(), addScore: vi.fn(), deleteScore: vi.fn() }));
vi.mock('@laravel/echo-react', () => ({ useEchoPublic: echo.useEchoPublic }));
vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));

const { useMatch, useMatches, useAddScore, useDeleteScore } = await import('./use-match');

function makeMatch(score = 0): CompetitionMatch {
    return {
        id: 1,
        number: 1,
        type: 'qualification',
        round: null,
        elimination_series_id: null,
        start_time: '',
        started_at: null,
        duration_ms: null,
        ended_at: null,
        status: 'ongoing',
        match_alliances: [{ id: 1, team: { id: 1, number: '100', name: 'Team' }, alliance: { id: 1, color: 'red' }, score, alliance_group_id: null }],
        scores: [],
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    api.getMatch.mockResolvedValue(makeMatch());
    api.getMatches.mockResolvedValue([makeMatch()]);
});

describe('match synchronization', () => {
    it('uses complete score events immediately without an HTTP refetch', async () => {
        const { client, Wrapper } = renderWithQueryClient(() => null);
        const { result } = renderHook(() => useMatch(1, 15000), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.data?.id).toBe(1));
        const updated = makeMatch(10);
        act(() => echo.emit('matches.1', 'ScoreUpdated', { match: updated }));
        await waitFor(() => expect(result.current.data?.match_alliances[0].score).toBe(10));
        expect(client.getQueryData(['matches', 1])).toEqual(updated);
        expect(api.getMatch).toHaveBeenCalledTimes(1);
    });

    it('prevents an in-flight poll from overwriting a newer score event', async () => {
        const { client, Wrapper } = renderWithQueryClient(() => null);
        client.setQueryData(['matches', 1], makeMatch());
        let finish!: (match: CompetitionMatch) => void;
        api.getMatch.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const { result } = renderHook(() => useMatch(1, 15000), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.data?.id).toBe(1));
        act(() => echo.emit('matches.1', 'ScoreUpdated', { match: makeMatch(10) }));
        await waitFor(() => expect(result.current.data?.match_alliances[0].score).toBe(10));
        await act(async () => finish(makeMatch()));
        expect(client.getQueryData<CompetitionMatch>(['matches', 1])?.match_alliances[0].score).toBe(10);
    });

    it('ignores a score payload for a different selected match', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        const { result } = renderHook(() => useMatch(1), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.data?.id).toBe(1));
        act(() => echo.emit('matches.1', 'ScoreUpdated', { match: { ...makeMatch(99), id: 2 } }));
        expect(result.current.data?.id).toBe(1);
        expect(result.current.data?.match_alliances[0].score).toBe(0);
    });

    it('updates match lists and the active match when auto-end is broadcast', async () => {
        const { client, Wrapper } = renderWithQueryClient(() => null);
        client.setQueryData(['active-match'], makeMatch());
        const { result } = renderHook(() => useMatches(), { wrapper: Wrapper });
        await waitFor(() => expect(result.current.data?.[0].id).toBe(1));
        act(() => echo.emit('match-control', 'MatchStatusChanged', { match: { ...makeMatch(), status: 'completed' }, action: 'ended' }));
        await waitFor(() => expect(result.current.data?.[0].status).toBe('completed'));
        expect(client.getQueryData(['active-match'])).toBeNull();
        expect(api.getMatches).toHaveBeenCalledTimes(1);
    });

    it('uses score mutation responses without another fetch', async () => {
        const { client, Wrapper } = renderWithQueryClient(() => null);
        api.addScore.mockResolvedValue({ match: makeMatch(10) });
        const { result } = renderHook(() => useAddScore(), { wrapper: Wrapper });
        await act(() => result.current.mutateAsync({ match_id: 1, team_id: 1, score_type_id: 1 }));
        expect(client.getQueryData(['matches', 1])).toEqual(makeMatch(10));
        expect(api.getMatch).not.toHaveBeenCalled();
    });

    it('optimistically undoes the awarded points even when the score type changed', async () => {
        const { client, Wrapper } = renderWithQueryClient(() => null);
        const match = makeMatch(10);
        match.scores = [{ id: 7, match_id: 1, team_id: 1, score_type_id: 1, points: 10, created_at: '' }];
        client.setQueryData(['matches', 1], match);
        let finish!: (value: { match: CompetitionMatch }) => void;
        api.deleteScore.mockImplementation(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                }),
        );
        const { result } = renderHook(() => useDeleteScore(), { wrapper: Wrapper });
        act(() => result.current.mutate({ scoreId: 7, matchId: 1, teamId: 1, points: 25 }));
        await waitFor(() => expect(client.getQueryData<CompetitionMatch>(['matches', 1])?.match_alliances[0].score).toBe(0));
        await act(async () => finish({ match: makeMatch() }));
        expect(client.getQueryData(['matches', 1])).toEqual(makeMatch());
    });
});
