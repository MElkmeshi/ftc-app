import type { TeamDisplay } from '@/types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const inertia = vi.hoisted(() => ({
    useProp: vi.fn<(name: string) => { value: TeamDisplay[] | undefined; loading: boolean; loaded: boolean }>(),
    rankingMethod: 'total_score',
}));

vi.mock('@inertiajs/react', () => ({
    Head: () => null,
    useProp: inertia.useProp,
    usePage: () => ({ props: { rankingMethod: inertia.rankingMethod } }),
}));

const { default: RefereeDisplay } = await import('@/pages/referee/display');

function makeTeam(overrides: Partial<TeamDisplay> = {}): TeamDisplay {
    return {
        team_id: 1,
        team_number: '100',
        team_name: 'Red Team',
        alliance_color: 'red',
        team_score: 10,
        alliance_score: 20,
        total_score: 30,
        played: 2,
        wins: 1,
        losses: 1,
        ties: 0,
        ranking_points: 1,
        average_score: 25,
        highest_score: 40,
        ...overrides,
    };
}

describe('RefereeDisplay', () => {
    it('renders the rankings live prop', () => {
        inertia.useProp.mockReturnValue({
            value: [makeTeam(), makeTeam({ team_id: 2, team_number: '200', team_name: 'Blue Team', total_score: 12 })],
            loading: false,
            loaded: true,
        });

        render(<RefereeDisplay />);

        expect(inertia.useProp).toHaveBeenCalledWith('rankings');
        expect(screen.getByText('Red Team')).toBeInTheDocument();
        expect(screen.getByText('Blue Team')).toBeInTheDocument();
        expect(screen.getByText('2 teams')).toBeInTheDocument();
    });

    it('shows the empty state when no matches are completed', () => {
        inertia.useProp.mockReturnValue({ value: [], loading: false, loaded: true });

        render(<RefereeDisplay />);

        expect(screen.getByText('No Completed Matches')).toBeInTheDocument();
    });

    it('shows win/loss records and ranking points for FTC-style rankings', () => {
        inertia.rankingMethod = 'record';
        inertia.useProp.mockReturnValue({ value: [makeTeam({ wins: 3, losses: 1, ties: 1, ranking_points: 1.4 })], loading: false, loaded: true });

        render(<RefereeDisplay />);

        expect(screen.getByText('3-1-1')).toBeInTheDocument();
        expect(screen.getByText('1.40')).toBeInTheDocument();
        expect(screen.getByText('Ranking pts')).toBeInTheDocument();
        inertia.rankingMethod = 'total_score';
    });
});
