import { TEST_TIMING, renderWithQueryClient } from '@/test/mocks';
import type { CompetitionMatch, ScoreType } from '@/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ url: '/event/testevent/referee/scoring' }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
    usePage: () => ({ url: page.url, props: { event: { code: 'testevent', field_count: 1 } } }),
}));
vi.mock('@/layouts/app-layout', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@laravel/echo-react', () => ({ useEchoPublic: vi.fn(), useConnectionStatus: () => 'connected' }));
vi.mock('@/hooks/use-match-config', () => ({
    useMatchConfig: () => ({ config: { timing: TEST_TIMING, sounds: { enabled: false, files: {} } }, loading: false, error: null }),
}));

const running = {
    id: 7,
    number: 4,
    type: 'qualification',
    round: null,
    field: 1,
    elimination_series_id: null,
    start_time: new Date().toISOString(),
    started_at: new Date().toISOString(),
    duration_ms: 173_000,
    ended_at: null,
    status: 'ongoing',
    scores: [],
    submissions: [],
    match_alliances: [
        { id: 1, score: 0, alliance_group_id: null, team: { id: 11, number: '100', name: 'Red Team' }, alliance: { id: 1, color: 'red' } },
        { id: 2, score: 0, alliance_group_id: null, team: { id: 22, number: '200', name: 'Blue Team' }, alliance: { id: 2, color: 'blue' } },
    ],
} as unknown as CompetitionMatch;

const scoreTypes = [
    {
        id: 5,
        name: 'high_basket',
        points: 8,
        target: 'alliance',
        kind: 'count',
        choice_set: null,
        referee: 'scoring',
        awarded_to: 'self',
        group_id: null,
    },
    {
        id: 6,
        name: 'minor_foul',
        points: 5,
        target: 'alliance',
        kind: 'count',
        choice_set: null,
        referee: 'penalty',
        awarded_to: 'opponent',
        group_id: null,
    },
] as ScoreType[];

const api = vi.hoisted(() => ({
    getMatches: vi.fn(),
    getActiveMatch: vi.fn(),
    getMatch: vi.fn(),
    getScoreTypes: vi.fn(),
    setScoreCount: vi.fn(),
    setAllianceSubmitted: vi.fn(),
    reportRefereeSeat: vi.fn(),
}));
vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));

const { default: RefereeScoring } = await import('@/pages/referee/scoring');

async function renderTablet(url: string) {
    page.url = url;
    const { Wrapper } = renderWithQueryClient(() => null);
    render(<RefereeScoring />, { wrapper: Wrapper });
    await act(async () => {});
}

describe('Referee scoring tablet', () => {
    beforeEach(() => {
        api.getMatches.mockResolvedValue([running]);
        api.getActiveMatch.mockResolvedValue(running);
        api.getMatch.mockResolvedValue(running);
        api.getScoreTypes.mockResolvedValue(scoreTypes);
        api.setScoreCount.mockResolvedValue({ match: running });
        api.reportRefereeSeat.mockResolvedValue({ sharing_with: [] });
    });

    afterEach(() => vi.clearAllMocks());

    it('offers every referee seat when the tablet has none yet', async () => {
        await renderTablet('/event/testevent/referee/scoring');

        expect(screen.getByRole('link', { name: 'Red Alliance Wall Scorer' })).toHaveAttribute(
            'href',
            '/event/testevent/referee/scoring?alliance=red&role=scoring',
        );
        expect(screen.getByRole('link', { name: 'Blue Referee (Fouls)' })).toHaveAttribute(
            'href',
            '/event/testevent/referee/scoring?alliance=blue&role=penalty',
        );
    });

    it("scores the seat's own alliance in the running match", async () => {
        await renderTablet('/event/testevent/referee/scoring?alliance=blue&role=scoring');

        expect(await screen.findByText('Blue Alliance Teams: 200')).toBeInTheDocument();
        expect(screen.queryByText('minor foul')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Add high basket' }));
        await act(async () => {});

        expect(api.setScoreCount).toHaveBeenCalledWith(expect.objectContaining({ match_id: 7, score_type_id: 5, alliance_id: 2, count: 1 }));
    });

    it("records a foul referee's call on the opposing alliance", async () => {
        await renderTablet('/event/testevent/referee/scoring?alliance=red&role=penalty');

        expect(await screen.findByText('Red Alliance Teams: 100')).toBeInTheDocument();
        expect(screen.queryByText('high basket')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Add minor foul' }));
        await act(async () => {});

        expect(api.setScoreCount).toHaveBeenCalledWith(expect.objectContaining({ score_type_id: 6, alliance_id: 2, count: 1 }));
    });
});
