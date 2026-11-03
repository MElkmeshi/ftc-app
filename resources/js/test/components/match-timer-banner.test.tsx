import { TEST_TIMING, renderWithQueryClient } from '@/test/mocks';
import type { CompetitionMatch } from '@/types';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const page = vi.hoisted(() => ({ fieldCount: 2 }));
vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { event: { field_count: page.fieldCount } } }) }));
vi.mock('@laravel/echo-react', () => ({ useEchoPublic: vi.fn() }));
vi.mock('@/hooks/use-match-config', () => ({
    useMatchConfig: () => ({ config: { timing: TEST_TIMING, sounds: { enabled: false, files: {} } }, loading: false, error: null }),
}));

const runningOnField1 = {
    id: 9,
    number: 3,
    type: 'qualification',
    round: null,
    field: 1,
    elimination_series_id: null,
    start_time: new Date().toISOString(),
    started_at: new Date().toISOString(),
    duration_ms: 173_000,
    ended_at: null,
    status: 'ongoing',
    match_alliances: [],
} as CompetitionMatch;

const api = vi.hoisted(() => ({
    getActiveMatch: vi.fn(),
    getMatches: vi.fn(),
    getMatch: vi.fn(),
}));
vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));

const { MatchTimerBanner } = await import('@/components/match-timer-banner');

async function renderBanner(props: { forRefereeTablet?: boolean } = {}) {
    const { Wrapper } = renderWithQueryClient(() => null);
    render(
        <Wrapper>
            <MatchTimerBanner showScores={false} {...props} />
        </Wrapper>,
    );
    await act(async () => {});
}

describe('MatchTimerBanner on a referee tablet', () => {
    beforeEach(() => {
        page.fieldCount = 2;
        window.localStorage.clear();
        api.getActiveMatch.mockResolvedValue(runningOnField1);
        api.getMatches.mockResolvedValue([runningOnField1]);
        api.getMatch.mockResolvedValue(runningOnField1);
    });

    afterEach(() => window.localStorage.clear());

    it('shows the running match with its field while the tablet scores any field', async () => {
        await renderBanner();

        expect(screen.getByRole('radio', { name: 'Any field' })).toHaveAttribute('aria-checked', 'true');
        expect(await screen.findByText('Field 1')).toBeInTheDocument();
    });

    it('ignores a match on another field once the tablet is set to its own field, and remembers the choice', async () => {
        await renderBanner();
        await screen.findByText('Field 1');

        fireEvent.click(screen.getByRole('radio', { name: 'Field 2' }));
        await act(async () => {});

        expect(screen.getByText('Waiting for the next match on Field 2.')).toBeInTheDocument();
        expect(screen.queryByText('Field 1', { selector: 'span' })).not.toBeInTheDocument();
        expect(window.localStorage.getItem('referee-field')).toBe('2');
    });

    it('offers no field choice at a single-field event', async () => {
        page.fieldCount = 1;
        window.localStorage.setItem('referee-field', '2');
        await renderBanner();
        await screen.findByText(/AUTONOMOUS|PRE-MATCH|Autonomous|Pre-match/i);

        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
        expect(screen.queryByText(/Waiting for the next match/)).not.toBeInTheDocument();
    });

    it('follows every field on pages that are not referee tablets', async () => {
        window.localStorage.setItem('referee-field', '2');
        await renderBanner({ forRefereeTablet: false });

        expect(await screen.findByText('Field 1')).toBeInTheDocument();
        expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
    });
});
