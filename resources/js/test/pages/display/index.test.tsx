import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const inertia = vi.hoisted(() => ({ url: '/event/main/display', fieldCount: 1, get: vi.fn() }));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ url: inertia.url, props: { event: { field_count: inertia.fieldCount } } }),
    router: { get: inertia.get },
}));

const presence = vi.hoisted(() => ({ onConfigured: null as null | ((config: unknown) => void) }));
vi.mock('@/hooks/use-display-presence', () => ({
    useDisplayPresence: (_config: unknown, onConfigured: (config: unknown) => void) => {
        presence.onConfigured = onConfigured;
        return 'screen-1';
    },
}));

const audio = vi.hoisted(() => ({ playSound: vi.fn(), unlocked: false }));
vi.mock('@/hooks/use-audio-engine', () => ({ useAudioEngine: () => audio }));

vi.mock('@/components/display/audience-screen', () => ({ AudienceScreen: () => <div>audience screen</div> }));
vi.mock('@/components/display/field-screen', () => ({
    FieldScreen: ({ flipped, field }: { flipped: boolean; field: number | null }) => (
        <div>
            field screen{flipped ? ' flipped' : ''}
            {field ? ` on field ${field}` : ''}
        </div>
    ),
}));
vi.mock('@/components/display/pit-screen', () => ({ PitScreen: () => <div>pit screen</div> }));
vi.mock('@/components/display/stream-overlay-screen', () => ({ StreamOverlayScreen: () => <div>overlay screen</div> }));

const { default: Display } = await import('@/pages/display/index');

describe('Display', () => {
    beforeEach(() => {
        inertia.get.mockClear();
        audio.playSound.mockClear();
        audio.unlocked = false;
        inertia.fieldCount = 1;
    });

    it('opens the settings on a screen that has not chosen a type yet, and saves the choice in the address', () => {
        inertia.url = '/event/main/display';
        render(<Display />);

        expect(screen.getByRole('dialog', { name: /Display Options/ })).toBeInTheDocument();

        fireEvent.change(screen.getByLabelText('Display Type'), { target: { value: 'field' } });
        fireEvent.click(screen.getByRole('button', { name: 'Advanced Settings' }));
        fireEvent.change(screen.getByLabelText('Alliance Orientation'), { target: { value: 'flipped' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(inertia.get).toHaveBeenCalledWith(expect.stringMatching(/\?type=field&flipped=1$/), {}, expect.objectContaining({ replace: true }));
    });

    it('shows the screen chosen in the address without asking again', () => {
        inertia.url = '/event/main/display?type=field&flipped=1';
        render(<Display />);

        expect(screen.getByText('field screen flipped')).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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

    it('chimes once when someone clicks to unmute, but not on a muted screen', () => {
        inertia.url = '/event/main/display?type=audience';
        const { rerender, unmount } = render(<Display />);
        expect(audio.playSound).not.toHaveBeenCalled();

        audio.unlocked = true;
        rerender(<Display />);
        rerender(<Display />);
        expect(audio.playSound).toHaveBeenCalledTimes(1);
        expect(audio.playSound).toHaveBeenCalledWith('unmute.wav');
        unmount();

        audio.playSound.mockClear();
        audio.unlocked = false;
        inertia.url = '/event/main/display?type=audience&mute=1';
        const muted = render(<Display />);
        audio.unlocked = true;
        muted.rerender(<Display />);
        expect(audio.playSound).not.toHaveBeenCalled();
    });

    it('lets a field screen follow one field at a multi-field event', () => {
        inertia.fieldCount = 2;
        inertia.url = '/event/main/display';
        const { unmount } = render(<Display />);

        fireEvent.change(screen.getByLabelText('Display Type'), { target: { value: 'field' } });
        fireEvent.change(screen.getByLabelText('Bind to Field'), { target: { value: '2' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(inertia.get).toHaveBeenCalledWith(expect.stringMatching(/\?type=field&field=2$/), {}, expect.anything());
        unmount();

        inertia.url = '/event/main/display?type=field&field=2';
        render(<Display />);
        expect(screen.getByText('field screen on field 2')).toBeInTheDocument();
    });

    it('does not offer a field choice at a single-field event', () => {
        inertia.url = '/event/main/display';
        render(<Display />);

        fireEvent.change(screen.getByLabelText('Display Type'), { target: { value: 'field' } });

        expect(screen.queryByLabelText('Bind to Field')).not.toBeInTheDocument();
    });

    it('switches when match control changes this screen remotely', () => {
        inertia.url = '/event/main/display?type=audience';
        render(<Display />);

        presence.onConfigured?.({ type: 'pit', mute: false, flipped: false, field: null, name: 'Pit TV' });

        expect(inertia.get).toHaveBeenCalledWith(expect.stringMatching(/\?type=pit&name=Pit\+TV$/), {}, expect.objectContaining({ replace: true }));
    });

    it('turns an audience screen into a stream overlay with its own chroma colour', () => {
        inertia.url = '/event/testevent/display';
        render(<Display />);

        fireEvent.click(screen.getByLabelText('Use Overlay'));
        fireEvent.click(screen.getByRole('button', { name: 'Overlay Settings' }));
        fireEvent.change(screen.getByLabelText('Overlay colour picker'), { target: { value: '#0000ff' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(inertia.get).toHaveBeenCalledWith(expect.stringMatching(/\?type=audience&overlay=1&color=%230000ff$/), {}, expect.anything());
    });
});
