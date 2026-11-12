import { renderWithQueryClient } from '@/test/mocks';
import type { AllianceGroup, AllianceSelectionUpdatedEvent, Team } from '@/types';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

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

vi.mock('@laravel/echo-react', () => ({ useEchoPublic: echo.useEcho }));

const api = vi.hoisted(() => ({
    getAllianceSelectionRankings: vi.fn(async () => []),
    getAllianceGroups: vi.fn(async () => []),
    getDeclinedTeams: vi.fn(async () => []),
}));

vi.mock('@/hooks/use-api', () => ({ useApi: () => api }));
vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    usePage: () => ({ props: { name: 'FTC App', event: { name: 'Test Event' }, currentGame: null } }),
}));

const { default: AllianceSelectionDisplay } = await import('@/pages/alliance-selection/display');

function makeTeam(id: number, number: string): Team {
    return { id, number, name: `Team ${number}` } as Team;
}

function makeGroup(seed: number, overrides: Partial<AllianceGroup> = {}): AllianceGroup {
    return {
        id: seed,
        seed,
        captain_team: makeTeam(seed * 100, String(seed * 100)),
        picked_team: null,
        pending_team: null,
        ...overrides,
    };
}

describe('alliance selection display', () => {
    it('renders selection state pushed over the broadcast without re-fetching', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<AllianceSelectionDisplay />, { wrapper: Wrapper });

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Waiting for alliance selection to begin'));

        api.getAllianceGroups.mockClear();

        const event: AllianceSelectionUpdatedEvent = {
            action: 'invited',
            groups: [makeGroup(1, { pending_team: makeTeam(11, '9999') }), makeGroup(2)],
            declined_teams: [],
            complete: false,
            current_pick_seed: 1,
        };

        await act(async () => {
            echo.emit('event.testevent.alliance-selection', 'AllianceSelectionUpdated', event);
        });

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Alliance #1 invited #9999'));
        expect(screen.getByText('9999')).toBeInTheDocument();
        expect(api.getAllianceGroups).not.toHaveBeenCalled();
    });

    it('strikes declined teams out of the team list', async () => {
        api.getAllianceSelectionRankings.mockResolvedValue([{ team_id: 77, team_number: '7777' }] as never);
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<AllianceSelectionDisplay />, { wrapper: Wrapper });

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Waiting for alliance selection to begin'));

        await act(async () => {
            echo.emit('event.testevent.alliance-selection', 'AllianceSelectionUpdated', {
                action: 'declined',
                groups: [makeGroup(1), makeGroup(2)],
                declined_teams: [makeTeam(77, '7777')],
                complete: false,
                current_pick_seed: 1,
            } satisfies AllianceSelectionUpdatedEvent);
        });

        await waitFor(() => expect(screen.getByText('7777')).toHaveClass('line-through'));
    });

    it('announces the alliance on the clock in seed order', async () => {
        const { Wrapper } = renderWithQueryClient(() => null);
        render(<AllianceSelectionDisplay />, { wrapper: Wrapper });

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Waiting for alliance selection to begin'));

        await act(async () => {
            echo.emit('event.testevent.alliance-selection', 'AllianceSelectionUpdated', {
                action: 'accepted',
                groups: [makeGroup(1, { picked_team: makeTeam(11, '1111') }), makeGroup(2)],
                declined_teams: [],
                complete: false,
                current_pick_seed: 2,
            } satisfies AllianceSelectionUpdatedEvent);
        });

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Alliance #2 is picking'));
    });
});
