import { TeamSelect } from '@/components/awards/team-select';
import { type AwardTeam } from '@/lib/award-utils';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const HACKSAW = { id: 1, number: '1001', name: 'Hacksaw' };
const SURGE = { id: 2, number: '1002', name: 'Surge' };
const GEARS = { id: 3, number: '2050', name: 'Gears of Tripoli' };
const TEAMS = [HACKSAW, SURGE, GEARS];

function renderSelect(value: AwardTeam | null = null) {
    const onChange = vi.fn();
    render(<TeamSelect id="winner-team" label="Winner Team" teams={TEAMS} value={value} onChange={onChange} />);

    return { onChange, box: screen.getByRole('combobox', { name: 'Winner Team' }) };
}

function optionNames(): (string | null)[] {
    return screen.getAllByRole('option').map((option) => option.textContent);
}

describe('TeamSelect', () => {
    it('lists every team of the event as number and name when it is opened', () => {
        const { box } = renderSelect();

        expect(screen.getByText('Select...')).toBeInTheDocument();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

        fireEvent.mouseDown(box);

        expect(optionNames()).toEqual(['1001 - Hacksaw', '1002 - Surge', '2050 - Gears of Tripoli']);
    });

    it('picks the team that is clicked and closes the list', () => {
        const { box, onChange } = renderSelect();

        fireEvent.mouseDown(box);
        fireEvent.click(screen.getByRole('option', { name: '1002 - Surge' }));

        expect(onChange).toHaveBeenCalledExactlyOnceWith(SURGE);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('narrows the list while typing a number or part of a name, whatever the case', () => {
        const { box } = renderSelect();

        fireEvent.change(box, { target: { value: 'tRIP' } });
        expect(optionNames()).toEqual(['2050 - Gears of Tripoli']);

        fireEvent.change(box, { target: { value: '100' } });
        expect(optionNames()).toEqual(['1001 - Hacksaw', '1002 - Surge']);

        fireEvent.change(box, { target: { value: 'zzz' } });
        expect(screen.getByText('No options')).toBeInTheDocument();
    });

    it('picks with the keyboard: arrows move through the list and wrap, Enter chooses', () => {
        const { box, onChange } = renderSelect();

        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(onChange).toHaveBeenCalledExactlyOnceWith(HACKSAW);
    });

    it('opens on the last team with the up arrow', () => {
        const { box, onChange } = renderSelect();

        fireEvent.keyDown(box, { key: 'ArrowUp' });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(onChange).toHaveBeenCalledExactlyOnceWith(GEARS);
    });

    it('opens on the chosen team, so the arrows move on from it', () => {
        const { box, onChange } = renderSelect(SURGE);

        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'ArrowDown' });
        fireEvent.keyDown(box, { key: 'Enter' });

        expect(onChange).toHaveBeenCalledExactlyOnceWith(GEARS);
    });

    it('closes without choosing on Escape and forgets what was typed', () => {
        const { box, onChange } = renderSelect(HACKSAW);

        fireEvent.change(box, { target: { value: 'sur' } });
        fireEvent.keyDown(box, { key: 'Escape' });

        expect(onChange).not.toHaveBeenCalled();
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
        expect(box).toHaveValue('');
        expect(screen.getByText('1001 - Hacksaw')).toBeInTheDocument();
    });

    it('shows the chosen team, marks it in the list and does not save it again when it is picked again', () => {
        const { box, onChange } = renderSelect(SURGE);

        fireEvent.mouseDown(box);

        expect(screen.getByRole('option', { name: '1002 - Surge' })).toHaveAttribute('aria-selected', 'true');

        fireEvent.keyDown(box, { key: 'Enter' });

        expect(onChange).not.toHaveBeenCalled();
    });

    it('clears the team with the cross or with Backspace, and has no cross when nothing is chosen', () => {
        const { box, onChange } = renderSelect(SURGE);

        fireEvent.mouseDown(screen.getByRole('button', { name: 'Clear Winner Team' }));
        fireEvent.keyDown(box, { key: 'Backspace' });

        expect(onChange.mock.calls).toEqual([[null], [null]]);
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('has no cross to clear when no team is chosen', () => {
        renderSelect();

        expect(screen.queryByRole('button', { name: 'Clear Winner Team' })).not.toBeInTheDocument();
    });

    it('closes the list when the box loses focus', () => {
        const { box } = renderSelect();

        fireEvent.focus(box);
        fireEvent.mouseDown(box);
        fireEvent.blur(box);

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
