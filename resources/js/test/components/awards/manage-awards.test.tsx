import { ManageAwards } from '@/components/awards/manage-awards';
import { type QueueSave } from '@/hooks/use-save-queue';
import { type AwardRow } from '@/lib/award-utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const BASE = '/event/testevent';

function award(id: number, name: string, overrides: Partial<AwardRow> = {}): AwardRow {
    return { id, name, description: null, is_team_award: false, places: 1, winners: [], ...overrides };
}

const AWARDS = [
    award(1, 'Inspire Award', { description: 'The top award.', is_team_award: true }),
    award(2, 'Think Award'),
    award(3, 'Volunteer Award'),
];

function renderPage(awards: AwardRow[] = AWARDS, saved = true) {
    const save = vi.fn<QueueSave>(async () => saved);
    render(<ManageAwards awards={awards} base={BASE} save={save} />);

    return save;
}

function card(name: string): HTMLElement {
    return screen.getByText(name).closest('div.mb-2') as HTMLElement;
}

function sent(save: ReturnType<typeof renderPage>): unknown[][] {
    return save.mock.calls.map((call) => call.slice(1));
}

describe('Manage Awards', () => {
    it('shows each award read-only with its description and whether it is a team award', () => {
        renderPage();

        const inspire = within(card('Inspire Award'));

        expect(inspire.getByRole('textbox', { name: 'Award Description' })).toHaveValue('The top award.');
        expect(inspire.getByRole('textbox', { name: 'Award Description' })).toHaveAttribute('readonly');
        expect(inspire.getByRole('checkbox', { name: 'Team Award?' })).toBeChecked();
        expect(inspire.getByRole('checkbox', { name: 'Team Award?' })).toBeDisabled();
        expect(within(card('Think Award')).getByRole('checkbox', { name: 'Team Award?' })).not.toBeChecked();
    });

    it('creates an award in a new card that replaces the button, as a non-team award unless ticked', async () => {
        const save = renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Create New Award' }));

        expect(screen.queryByRole('button', { name: 'Create New Award' })).not.toBeInTheDocument();

        fireEvent.change(screen.getByRole('textbox', { name: 'Award Name' }), { target: { value: 'Spirit Award' } });
        fireEvent.change(screen.getAllByRole('textbox', { name: 'Award Description' })[0], { target: { value: 'Loudest team.' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(sent(save)).toEqual([['post', `${BASE}/awards`, { name: 'Spirit Award', description: 'Loudest team.', is_team_award: false }]]);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Create New Award' })).toBeInTheDocument());
    });

    it('drops the new card on Cancel without saving', () => {
        const save = renderPage();

        fireEvent.click(screen.getByRole('button', { name: 'Create New Award' }));
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Create New Award' })).toBeInTheDocument();
    });

    it('edits an award in place and leaves edit mode once it is saved', async () => {
        const save = renderPage();
        const think = within(card('Think Award'));

        fireEvent.click(think.getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Award Name' }), { target: { value: 'Think Big Award' } });
        fireEvent.click(within(screen.getByRole('textbox', { name: 'Award Name' }).closest('div.mb-2') as HTMLElement).getByRole('checkbox'));
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        expect(sent(save)).toEqual([['put', `${BASE}/awards/2`, { name: 'Think Big Award', description: '', is_team_award: true }]]);
        await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument());
    });

    it('stays in edit mode with what was typed when the save is refused', async () => {
        const save = renderPage(AWARDS, false);

        fireEvent.click(within(card('Think Award')).getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Award Name' }), { target: { value: 'Inspire Award' } });
        fireEvent.click(screen.getByRole('button', { name: 'Save' }));

        await waitFor(() => expect(save).toHaveBeenCalled());
        expect(screen.getByRole('textbox', { name: 'Award Name' })).toHaveValue('Inspire Award');
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('puts the award back as it was on Cancel', () => {
        const save = renderPage();

        fireEvent.click(within(card('Think Award')).getByRole('button', { name: 'Edit' }));
        fireEvent.change(screen.getByRole('textbox', { name: 'Award Name' }), { target: { value: 'Something else' } });
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(save).not.toHaveBeenCalled();
        expect(screen.getByText('Think Award')).toBeInTheDocument();
        expect(screen.queryByText('Something else')).not.toBeInTheDocument();
    });

    it('deletes an award only after it is confirmed', () => {
        const save = renderPage();

        fireEvent.click(within(card('Think Award')).getByRole('button', { name: 'Delete' }));

        const dialog = within(screen.getByRole('dialog'));

        expect(dialog.getByText('Are you sure you want to delete the "Think Award" award? This cannot be undone.')).toBeInTheDocument();
        expect(save).not.toHaveBeenCalled();

        fireEvent.click(dialog.getByRole('button', { name: 'Delete' }));

        expect(sent(save)).toEqual([['delete', `${BASE}/awards/2`]]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps the award when the delete is cancelled', () => {
        const save = renderPage();

        fireEvent.click(within(card('Think Award')).getByRole('button', { name: 'Delete' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));

        expect(save).not.toHaveBeenCalled();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('swaps an award with its neighbour, and cannot move the first up or the last down', () => {
        const save = renderPage();

        expect(screen.getByRole('button', { name: 'Move Inspire Award up' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Move Volunteer Award down' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'Move Think Award up' }));
        fireEvent.click(screen.getByRole('button', { name: 'Move Think Award down' }));

        expect(sent(save)).toEqual([
            ['post', `${BASE}/awards/swap`, { first: 1, second: 2 }],
            ['post', `${BASE}/awards/swap`, { first: 2, second: 3 }],
        ]);
    });

    it('has no arrows when there is only one award', () => {
        renderPage([award(1, 'Inspire Award')]);

        expect(screen.queryByRole('button', { name: /Move Inspire Award/ })).not.toBeInTheDocument();
    });
});
