import { TEST_TIMING, renderWithQueryClient } from '@/test/mocks';
import type { AudienceDisplayState, CompetitionMatch } from '@/types';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@laravel/echo-react', () => ({ useEchoPublic: vi.fn(), useEcho: vi.fn() }));

vi.mock('@/hooks/use-match-config', () => ({
    useMatchConfig: () => ({ config: { timing: TEST_TIMING, sounds: { enabled: false, files: {} } }, loading: false, error: null }),
}));

const loaded: CompetitionMatch = {
    id: 5,
    number: 7,
    type: 'qualification',
    round: null,
    elimination_series_id: null,
    start_time: new Date().toISOString(),
    started_at: null,
    duration_ms: null,
    ended_at: null,
    status: 'upcoming',
    match_alliances: [
        { id: 1, score: 0, alliance_group_id: null, team: { id: 1, number: '100', name: 'Red Team' }, alliance: { id: 1, color: 'red' } },
        { id: 2, score: 0, alliance_group_id: null, team: { id: 2, number: '200', name: 'Blue Team' }, alliance: { id: 2, color: 'blue' } },
    ],
} as CompetitionMatch;

const api = vi.hoisted(() => ({
    getMatches: vi.fn(async () => []),
    getActiveMatch: vi.fn(async () => null),
    getMatch: vi.fn(),
    getLoadedMatch: vi.fn(async () => null),
    getGroups: vi.fn(async () => []),
}));

vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));

const page = vi.hoisted(() => ({ display: { mode: 'blank', match_id: null, changed_at: null } as unknown }));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: { event: { code: 'testevent', name: 'Test Event' }, name: 'FTC App', currentGame: null } }),
    useProp: (name: string) => ({ value: name === 'display' ? page.display : [] }),
}));

vi.mock('@/pages/elimination/bracket', () => ({ default: () => <div>bracket screen</div> }));
vi.mock('@/components/display/pit-screen', () => ({ RankingsBoard: () => <div>rankings screen</div> }));
vi.mock('@/components/display/alliance-selection-screen', () => ({ AllianceSelectionScreen: () => <div>selection screen</div> }));

const { StreamOverlayScreen } = await import('@/components/display/stream-overlay-screen');

function show(display: Partial<AudienceDisplayState>) {
    page.display = { mode: 'blank', match_id: null, changed_at: null, ...display };
    const { Wrapper } = renderWithQueryClient(() => null);

    return render(<StreamOverlayScreen chromaColor="#00ff00" />, { wrapper: Wrapper });
}

describe('StreamOverlayScreen', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it('shows only the team bar over the chroma colour for a preview', async () => {
        api.getMatch.mockResolvedValue(loaded);
        const { container } = show({ mode: 'preview', match_id: loaded.id });

        expect(await screen.findByText('Red Team')).toBeInTheDocument();
        expect(screen.getByText('Blue Team')).toBeInTheDocument();
        expect(screen.queryByText('Up Next')).not.toBeInTheDocument();
        expect(container.firstElementChild).toHaveStyle({ backgroundColor: '#00ff00' });
    });

    it('shows the score bar with the match clock while the match is up', async () => {
        api.getMatch.mockResolvedValue(loaded);
        show({ mode: 'match', match_id: loaded.id });

        expect(await screen.findByText('100')).toBeInTheDocument();
        expect(screen.getByText('2:30')).toBeInTheDocument();
    });

    it('is nothing but the chroma colour in video-only mode, and a normal screen otherwise', () => {
        const { container, unmount } = show({ mode: 'video' });
        expect(container.firstElementChild).toBeEmptyDOMElement();
        unmount();

        show({ mode: 'rankings' });
        expect(screen.getByText('rankings screen')).toBeInTheDocument();
    });
});
