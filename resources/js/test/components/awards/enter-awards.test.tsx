import { EnterAwards } from '@/components/awards/enter-awards';
import { type QueueSave } from '@/hooks/use-save-queue';
import { type AwardRow, type AwardWinnerRow } from '@/lib/award-utils';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const HACKSAW = { id: 1, number: '1001', name: 'Hacksaw' };
const SURGE = { id: 2, number: '1002', name: 'Surge' };
const BASE = '/event/testevent';

function winner(place: number, overrides: Partial<AwardWinnerRow> = {}): AwardWinnerRow {
    return { id: place, place, recipient: null, comment: null, team: null, ...overrides };
}

function award(id: number, name: string, overrides: Partial<AwardRow> = {}): AwardRow {
    return { id, name, description: null, is_team_award: true, places: 1, winners: [], ...overrides };
}

function renderPage(awards: AwardRow[], locked = false) {
    const save = vi.fn<QueueSave>(async () => true);
    const view = render(<EnterAwards awards={awards} teams={[HACKSAW, SURGE]} base={BASE} locked={locked} save={save} />);
    const rerender = (next: AwardRow[]) =>
        view.rerender(<EnterAwards awards={next} teams={[HACKSAW, SURGE]} base={BASE} locked={locked} save={save} />);

    return { save, rerender };
}

function listItem(name: RegExp): HTMLElement {
    return screen.getByRole('button', { name });
}

function pickTeam(box: string, team: string) {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: box }));
    fireEvent.click(screen.getByRole('option', { name: team }));
}

describe('Enter Awards', () => {
    it('asks for an award to be selected, and lists each award with who it was given to', () => {
        renderPage([
            award(1, 'Design Award', { winners: [winner(1, { team: HACKSAW })] }),
            award(2, 'Volunteer Award', { is_team_award: false, winners: [winner(1, { recipient: 'Sam Rivera', team: SURGE })] }),
            award(3, 'Think Award'),
        ]);

        expect(screen.getByText('Select an award to edit')).toBeInTheDocument();
        expect(listItem(/Design Award/)).toHaveTextContent('Design Award1001 Hacksaw');
        expect(listItem(/Volunteer Award/)).toHaveTextContent('Volunteer AwardSam Rivera - 1002 Surge');
        expect(listItem(/Think Award/)).toHaveTextContent('Think AwardNOT GIVEN');
    });

    it('shows a team award with only a team box per slot, and judges comments for the winner only', () => {
        renderPage([award(1, 'Design Award', { description: 'For great design.', places: 3 })]);

        fireEvent.click(listItem(/Design Award/));

        expect(screen.getByRole('heading', { name: 'Design Award' })).toBeInTheDocument();
        expect(screen.getByText('For great design.')).toBeInTheDocument();
        expect(screen.getByText('Status').parentElement).toHaveTextContent('Status Optional');
        expect(screen.getByText('Winner')).toBeInTheDocument();
        expect(screen.getByText('Second Place')).toBeInTheDocument();
        expect(screen.getByText('Third Place')).toBeInTheDocument();
        expect(screen.getAllByRole('combobox').map((box) => box.getAttribute('aria-label'))).toEqual([
            'Winner Team',
            'Second Place Team',
            'Third Place Team',
        ]);
        expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
        expect(screen.getAllByLabelText("Judges' Comments")).toHaveLength(1);
    });

    it('saves a team as soon as it is picked and marks the award as given straight away', () => {
        const { save } = renderPage([award(1, 'Design Award')]);

        fireEvent.click(listItem(/Design Award/));
        pickTeam('Winner Team', '1002 - Surge');

        expect(save).toHaveBeenCalledExactlyOnceWith('slot-1-1', 'put', `${BASE}/awards/1/slots/1`, { team: 1002, name: '', comment: '' });
        expect(listItem(/Design Award/)).toHaveTextContent('Design Award1002 Surge');
        expect(screen.getByText('Status').parentElement).toHaveTextContent('Status Already given');
    });

    it('asks for a name and an optional team when the award goes to a person, and saves every keystroke with the rest of the slot', () => {
        const { save } = renderPage([
            award(2, 'Volunteer Award', { is_team_award: false, winners: [winner(1, { team: SURGE, comment: 'Always there.' })] }),
        ]);

        fireEvent.click(listItem(/Volunteer Award/));

        expect(screen.getByText('Team (optional)')).toBeInTheDocument();
        expect(listItem(/Volunteer Award/)).toHaveTextContent('NOT GIVEN');

        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam ' } });

        expect(save).toHaveBeenLastCalledWith('slot-2-1', 'put', `${BASE}/awards/2/slots/1`, { team: 1002, name: 'Sam ', comment: 'Always there.' });
        expect(screen.getByLabelText('Name')).toHaveValue('Sam ');
        expect(listItem(/Volunteer Award/)).toHaveTextContent('Volunteer AwardSam - 1002 Surge');
    });

    it('keeps what is being typed when the saved award comes back from the server', () => {
        const { rerender } = renderPage([award(2, 'Volunteer Award', { is_team_award: false })]);

        fireEvent.click(listItem(/Volunteer Award/));
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sam ' } });
        rerender([award(2, 'Volunteer Award', { is_team_award: false, winners: [winner(1, { recipient: 'Sam' })] })]);

        expect(screen.getByLabelText('Name')).toHaveValue('Sam ');
    });

    it('saves the judges comments and a cleared team', () => {
        const { save } = renderPage([award(1, 'Design Award', { winners: [winner(1, { team: HACKSAW })] })]);

        fireEvent.click(listItem(/Design Award/));
        fireEvent.change(screen.getByLabelText("Judges' Comments"), { target: { value: 'Clean build.' } });
        fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear Winner Team' }));

        expect(save.mock.calls.map((call) => call[3])).toEqual([
            { team: 1001, name: '', comment: 'Clean build.' },
            { team: null, name: '', comment: 'Clean build.' },
        ]);
        expect(listItem(/Design Award/)).toHaveTextContent('NOT GIVEN');
    });

    it('adds and removes slots on the server, never merging two clicks into one', () => {
        const { save } = renderPage([award(1, 'Design Award')]);

        fireEvent.click(listItem(/Design Award/));
        fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
        fireEvent.click(screen.getByRole('button', { name: 'Add slot' }));
        fireEvent.click(screen.getByRole('button', { name: 'Remove slot' }));

        expect(save.mock.calls.map((call) => call.slice(1))).toEqual([
            ['post', `${BASE}/awards/1/slots`],
            ['post', `${BASE}/awards/1/slots`],
            ['delete', `${BASE}/awards/1/slots`],
        ]);
        expect(new Set(save.mock.calls.map((call) => call[0])).size).toBe(3);
    });

    it('forgets what was typed in a slot once that slot is removed, so adding it back starts empty', () => {
        const { rerender } = renderPage([award(1, 'Design Award', { places: 2 })]);

        fireEvent.click(listItem(/Design Award/));
        pickTeam('Second Place Team', '1001 - Hacksaw');
        rerender([award(1, 'Design Award', { places: 1 })]);
        rerender([award(1, 'Design Award', { places: 2 })]);

        expect(within(screen.getByText('Second Place').parentElement as HTMLElement).getByText('Select...')).toBeInTheDocument();
    });

    it('shows no slots but still offers to add one when every slot was removed', () => {
        renderPage([award(1, 'Design Award', { places: 0 })]);

        fireEvent.click(listItem(/Design Award/));

        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Add slot' })).toBeInTheDocument();
    });

    it('finalizes the awards, and offers to unsubmit them once they are finalized while still allowing edits', () => {
        const { save } = renderPage([award(1, 'Design Award')]);

        fireEvent.click(screen.getByRole('button', { name: 'Finalize Awards for Presentation' }));

        expect(save).toHaveBeenCalledExactlyOnceWith('lock', 'put', `${BASE}/awards/lock`, { locked: true });
    });

    it('offers to unsubmit finalized awards and still lets them be edited', () => {
        const { save } = renderPage([award(1, 'Design Award')], true);

        fireEvent.click(screen.getByRole('button', { name: 'Unsubmit Awards for Presentation' }));
        fireEvent.click(listItem(/Design Award/));

        expect(save).toHaveBeenCalledExactlyOnceWith('lock', 'put', `${BASE}/awards/lock`, { locked: false });
        expect(screen.getByRole('combobox', { name: 'Winner Team' })).toBeEnabled();
    });
});
