import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEST_TIMING, renderWithQueryClient } from '@/test/mocks';
import type { CompetitionMatch, MatchStatusChangedEvent } from '@/types';

const echo = vi.hoisted(() => {
    const handlers = new Map<string, (payload: unknown) => void>();
    return {
        useEcho: vi.fn((channel: string, event: string, callback: (payload: unknown) => void) => {
            handlers.set(`${channel}:${event}`, callback);
        }),
        emit: (channel: string, event: string, payload: unknown) => {
            const handler = handlers.get(`${channel}:${event}`);
            if (!handler) throw new Error(`No useEcho handler registered for ${channel}:${event}`);
            handler(payload);
        },
    };
});

vi.mock('@laravel/echo-react', () => ({ useEcho: echo.useEcho }));

vi.mock('@/hooks/use-audio-engine', () => ({
    useAudioEngine: () => ({ playSound: vi.fn() }),
}));

vi.mock('@/hooks/use-match-config', () => ({
    useMatchConfig: () => ({ config: { timing: TEST_TIMING, sounds: { enabled: false, files: {} } }, loading: false, error: null }),
}));

const api = vi.hoisted(() => ({
    getMatches: vi.fn(async () => []),
    getActiveMatch: vi.fn(async () => null),
    getMatch: vi.fn(async () => null),
    getLoadedMatch: vi.fn(async () => null),
}));

vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));

vi.mock('@inertiajs/react', () => ({ Head: () => null }));

// Import after mocks so the mocked modules are in place before module init.
const { default: MatchControl } = await import('@/pages/referee/match-control');

function makeMatch(overrides: Partial<CompetitionMatch> = {}): CompetitionMatch {
    return {
        id: 1,
        number: 1,
        type: 'qualification',
        round: null,
        elimination_series_id: null,
        start_time: new Date().toISOString(),
        started_at: new Date().toISOString(),
        duration_ms: 173_000,
        ended_at: null,
        status: 'ongoing',
        match_alliances: [
            {
                id: 1,
                score: 20,
                alliance_group_id: null,
                team: { id: 1, number: '100', name: 'Red Team' },
                alliance: { id: 1, color: 'red' },
            },
            {
                id: 2,
                score: 8,
                alliance_group_id: null,
                team: { id: 2, number: '200', name: 'Blue Team' },
                alliance: { id: 2, color: 'blue' },
            },
        ],
        ...overrides,
    };
}

describe('MatchControl', () => {
    beforeEach(() => {
        api.getMatches.mockResolvedValue([]);
        api.getActiveMatch.mockResolvedValue(null);
        api.getMatch.mockResolvedValue(null);
        api.getLoadedMatch.mockResolvedValue(null);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows the winner banner from the ended broadcast, using its final scores directly (no re-fetch)', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<MatchControl />, { wrapper: Wrapper });

        const endedMatch = makeMatch({ status: 'completed', ended_at: new Date().toISOString() });

        act(() => {
            echo.emit('match-control', 'MatchStatusChanged', { match: endedMatch, action: 'ended' } satisfies MatchStatusChangedEvent);
        });

        expect(await screen.findByText(/RED ALLIANCE WINS!/i)).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
        expect(screen.getByText('8')).toBeInTheDocument();
        // The banner rendered straight from the broadcast payload — no extra fetch triggered.
        expect(api.getMatch).not.toHaveBeenCalled();
    });

    it('clears the winner banner once a new match starts', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<MatchControl />, { wrapper: Wrapper });

        const endedMatch = makeMatch({ id: 1, status: 'completed', ended_at: new Date().toISOString() });
        act(() => {
            echo.emit('match-control', 'MatchStatusChanged', { match: endedMatch, action: 'ended' } satisfies MatchStatusChangedEvent);
        });
        expect(await screen.findByText(/WINS!/i)).toBeInTheDocument();

        const nextMatch = makeMatch({ id: 2, status: 'ongoing', ended_at: null });
        act(() => {
            echo.emit('match-control', 'MatchStatusChanged', { match: nextMatch, action: 'started' } satisfies MatchStatusChangedEvent);
        });

        expect(screen.queryByText(/WINS!/i)).not.toBeInTheDocument();
    });

    it('ignores a duplicate ended broadcast for the same match', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<MatchControl />, { wrapper: Wrapper });

        const endedMatch = makeMatch({ status: 'completed', ended_at: new Date().toISOString() });
        act(() => {
            echo.emit('match-control', 'MatchStatusChanged', { match: endedMatch, action: 'ended' } satisfies MatchStatusChangedEvent);
        });
        await screen.findByText(/WINS!/i);

        // A second 'ended' for the same match (e.g. a retried broadcast) shouldn't re-trigger anything unexpected.
        act(() => {
            echo.emit('match-control', 'MatchStatusChanged', { match: endedMatch, action: 'ended' } satisfies MatchStatusChangedEvent);
        });

        expect(screen.getAllByText(/WINS!/i)).toHaveLength(1);
    });
});
