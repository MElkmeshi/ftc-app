import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertia = vi.hoisted(() => ({ url: '/event/main/display', get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: inertia.url }),
    router: { get: inertia.get },
}));

const audio = vi.hoisted(() => ({ playSound: vi.fn(), unlocked: false }));
vi.mock('@/hooks/use-audio-engine', () => ({ useAudioEngine: () => audio }));

vi.mock('@/components/display/audience-screen', () => ({ AudienceScreen: () => <div>audience screen</div> }));
vi.mock('@/components/display/field-screen', () => ({
    FieldScreen: ({ flipped }: { flipped: boolean }) => <div>field screen{flipped ? ' flipped' : ''}</div>,
}));
vi.mock('@/components/display/pit-screen', () => ({ PitScreen: () => <div>pit screen</div> }));
vi.mock('@/components/display/stream-overlay-screen', () => ({ StreamOverlayScreen: () => <div>overlay screen</div> }));

const { default: Display } = await import('@/pages/display/index');

describe('Display', () => {
    beforeEach(() => {
        inertia.get.mockClear();
    });

    it('opens the settings on a screen that has not chosen a type yet, and saves the choice in the address', () => {
        inertia.url = '/event/main/display';
        render(<Display />);

        expect(screen.getByText('Display settings')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('radio', { name: /Field/ }));
        fireEvent.click(screen.getByLabelText('Swap sides (blue alliance on the left)'));
        fireEvent.click(screen.getByRole('button', { name: 'Show on this screen' }));

        expect(inertia.get).toHaveBeenCalledWith(expect.stringMatching(/\?type=field&flipped=1$/), {}, expect.objectContaining({ replace: true }));
    });

    it('shows the screen chosen in the address without asking again', () => {
        inertia.url = '/event/main/display?type=field&flipped=1';
        render(<Display />);

        expect(screen.getByText('field screen flipped')).toBeInTheDocument();
        expect(screen.queryByText('Display settings')).not.toBeInTheDocument();
    });

    it('warns about blocked sound only on screens that play it', () => {
        inertia.url = '/event/main/display?type=audience';
        const { unmount } = render(<Display />);
        expect(screen.getByRole('alert')).toHaveTextContent('This display is set to play sounds but currently cannot');
        unmount();

        inertia.url = '/event/main/display?type=audience&mute=1';
        const muted = render(<Display />);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        muted.unmount();

        inertia.url = '/event/main/display?type=pit';
        render(<Display />);
        expect(screen.getByText('pit screen')).toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
});
