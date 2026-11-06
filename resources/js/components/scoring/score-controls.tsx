import { type ScoreControl } from '@/lib/score-controls';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { type CSSProperties } from 'react';

export const formatScoreName = (name: string) => name.replace(/_/g, ' ');

interface ControlProps {
    control: ScoreControl;
    countFor: (scoreTypeId: number) => number;
    onAdd: (scoreTypeId: number) => void;
    onRemove: (scoreTypeId: number) => void;
    disabled: boolean;
    color: string;
}

function ToggleOption({
    label,
    selected,
    disabled,
    color,
    onClick,
}: {
    label: string;
    selected: boolean;
    disabled: boolean;
    color: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={onClick}
            style={{ '--toggle-color': color } as CSSProperties}
            className={cn(
                'min-h-[38px] flex-1 border border-(--toggle-color) px-3 py-1.5 capitalize transition-colors not-first:-ml-px first:rounded-l-md last:rounded-r-md disabled:opacity-65',
                selected ? 'bg-(--toggle-color) text-white' : 'bg-white text-(--toggle-color) hover:bg-(--toggle-color) hover:text-white',
            )}
        >
            {label}
        </button>
    );
}

/**
 * FTC Live's toggle: the score type's name, then a button group. A yes/no
 * score type is No / Yes; a "one of" choice is None, then each option, and
 * choosing one replaces the previous one on the server.
 */
export function ScoreControlButtons({ control, countFor, onAdd, onRemove, disabled, color }: ControlProps) {
    const isToggle = control.kind === 'toggle';
    const chosen = control.options.find((option) => countFor(option.id) > 0);
    const options = [
        { key: 'none', label: isToggle ? 'No' : 'None', selected: !chosen, onClick: () => chosen && onRemove(chosen.id) },
        ...control.options.map((option) => ({
            key: String(option.id),
            label: isToggle ? 'Yes' : formatScoreName(option.name),
            selected: chosen?.id === option.id,
            onClick: () => (chosen?.id === option.id ? onRemove(option.id) : onAdd(option.id)),
        })),
    ];

    return (
        <div role="group" aria-label={formatScoreName(control.label)} className="mb-2 flex flex-wrap items-center gap-y-1">
            <span className="w-1/3 pr-2 capitalize">{formatScoreName(control.label)}</span>
            <div className="flex w-2/3 max-w-md">
                {options.map((option) => (
                    <ToggleOption
                        key={option.key}
                        label={option.label}
                        selected={option.selected}
                        disabled={disabled}
                        color={color}
                        onClick={option.onClick}
                    />
                ))}
            </div>
        </div>
    );
}

/** FTC Live's counter: the label, then −, the count and + in the alliance colour. */
export function ScoreCounter({
    label,
    value,
    onAdd,
    onRemove,
    disabled,
    color,
}: {
    label: string;
    value: number;
    onAdd: () => void;
    onRemove: () => void;
    disabled: boolean;
    color: string;
}) {
    return (
        <div className="mb-2 flex items-center gap-2">
            <span className="flex-1 capitalize">{label}</span>
            <div className="flex w-auto max-w-[275px]" role="group" aria-label={label}>
                <button
                    type="button"
                    aria-label={`Remove ${label}`}
                    disabled={disabled || value <= 0}
                    onClick={onRemove}
                    className="flex min-h-[46px] grow touch-manipulation items-center justify-center rounded-l-md bg-[#dddddd] px-3 text-2xl leading-none text-[#212529] active:brightness-85 disabled:opacity-65"
                >
                    <Minus className="size-6" strokeWidth={3} />
                </button>
                <input
                    readOnly
                    aria-label={`${label} count`}
                    value={value}
                    className="w-[3em] min-w-[3em] border-y border-[#dee2e6] bg-white text-center text-[125%] text-[#212529] tabular-nums"
                />
                <button
                    type="button"
                    aria-label={`Add ${label}`}
                    disabled={disabled}
                    onClick={onAdd}
                    style={{ backgroundColor: color }}
                    className="flex min-h-[46px] grow touch-manipulation items-center justify-center rounded-r-md px-3 text-white active:brightness-85 disabled:opacity-65"
                >
                    <Plus className="size-6" strokeWidth={3} />
                </button>
            </div>
        </div>
    );
}
