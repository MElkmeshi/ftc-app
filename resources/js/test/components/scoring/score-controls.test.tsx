import { ScoreControlButtons } from '@/components/scoring/score-controls';
import { splitScoreTypes } from '@/lib/score-controls';
import type { ScoreType } from '@/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const scoreType = (id: number, name: string, points: number, kind: ScoreType['kind'] = 'count', choiceSet: string | null = null): ScoreType =>
    ({ id, name, points, target: 'team', kind, choice_set: choiceSet, group_id: null, icon_url: null }) as ScoreType;

describe('splitScoreTypes', () => {
    it('keeps counters apart and groups "one of" options by set, lowest points first', () => {
        const { counters, controls } = splitScoreTypes([
            scoreType(1, 'artifact', 3),
            scoreType(2, 'level_3', 30, 'choice', 'Ascent'),
            scoreType(3, 'leave', 3, 'toggle'),
            scoreType(4, 'park', 3, 'choice', 'Ascent'),
        ]);

        expect(counters.map((st) => st.id)).toEqual([1]);
        expect(controls.map((control) => [control.kind, control.label, control.options.map((st) => st.id)])).toEqual([
            ['choice', 'Ascent', [4, 2]],
            ['toggle', 'leave', [3]],
        ]);
    });
});

describe('ScoreControlButtons', () => {
    const ascent = splitScoreTypes([scoreType(4, 'park', 3, 'choice', 'Ascent'), scoreType(2, 'level_3', 30, 'choice', 'Ascent')]).controls[0];

    it('picks an option, and None clears the chosen one', () => {
        const onAdd = vi.fn();
        const onRemove = vi.fn();
        const { rerender } = render(
            <ScoreControlButtons control={ascent} countFor={() => 0} onAdd={onAdd} onRemove={onRemove} disabled={false} color="#ed1c24" />,
        );

        expect(screen.getByRole('button', { name: /None/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: /level 3/ }));
        expect(onAdd).toHaveBeenCalledWith(2);

        rerender(
            <ScoreControlButtons
                control={ascent}
                countFor={(id) => (id === 2 ? 1 : 0)}
                onAdd={onAdd}
                onRemove={onRemove}
                disabled={false}
                color="#ed1c24"
            />,
        );
        expect(screen.getByRole('button', { name: /level 3/ })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: /None/ }));
        expect(onRemove).toHaveBeenCalledWith(2);
    });

    it('turns a yes/no score type on with Yes and off with No', () => {
        const leave = splitScoreTypes([scoreType(3, 'leave', 3, 'toggle')]).controls[0];
        const onAdd = vi.fn();
        const onRemove = vi.fn();
        const { rerender } = render(
            <ScoreControlButtons control={leave} countFor={() => 0} onAdd={onAdd} onRemove={onRemove} disabled={false} color="#ed1c24" />,
        );

        expect(screen.getByRole('group', { name: 'leave' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Yes' }));
        expect(onAdd).toHaveBeenCalledWith(3);

        rerender(<ScoreControlButtons control={leave} countFor={() => 1} onAdd={onAdd} onRemove={onRemove} disabled={false} color="#ed1c24" />);
        expect(screen.getByRole('button', { name: 'Yes' })).toHaveAttribute('aria-pressed', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'No' }));
        expect(onRemove).toHaveBeenCalledWith(3);
    });
});
