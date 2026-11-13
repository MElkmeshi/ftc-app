import { cn } from '@/lib/utils';
import { type Team } from '@/types';
import { ChevronDown, X } from 'lucide-react';
import { useRef, useState } from 'react';

type TeamOption = Pick<Team, 'id' | 'number' | 'name'>;

function optionLabel(team: TeamOption): string {
    return `${team.number} - ${team.name}`;
}

/**
 * A searchable list of the event's teams, like the team box on FTC Live's
 * Enter Awards page. Several teams can be chosen for an alliance award.
 */
export function TeamPicker({
    id,
    teams,
    selected,
    disabled,
    onChange,
}: {
    id: string;
    teams: TeamOption[];
    selected: string[];
    disabled: boolean;
    onChange: (numbers: string[]) => void;
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const chosen = selected.map((number) => teams.find((team) => String(team.number) === number) ?? { id: -Number(number), number, name: '' });
    const options = teams.filter(
        (team) => !selected.includes(String(team.number)) && optionLabel(team).toLowerCase().includes(search.trim().toLowerCase()),
    );

    const add = (team: TeamOption) => {
        onChange([...selected, String(team.number)]);
        setSearch('');
        setHighlighted(0);
        setOpen(false);
    };

    const onKeyDown = (keyEvent: React.KeyboardEvent<HTMLInputElement>) => {
        if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowUp') {
            keyEvent.preventDefault();
            setOpen(true);
            setHighlighted((current) => Math.max(0, Math.min(options.length - 1, current + (keyEvent.key === 'ArrowDown' ? 1 : -1))));
        } else if (keyEvent.key === 'Enter' && open && options[highlighted]) {
            keyEvent.preventDefault();
            add(options[highlighted]);
        } else if (keyEvent.key === 'Escape') {
            setOpen(false);
        } else if (keyEvent.key === 'Backspace' && search === '' && selected.length > 0) {
            onChange(selected.slice(0, -1));
        }
    };

    return (
        <div className="relative" onBlur={(blurEvent) => !blurEvent.currentTarget.contains(blurEvent.relatedTarget) && setOpen(false)}>
            <div
                className={cn(
                    'flex min-h-[38px] cursor-text flex-wrap items-center gap-1 rounded-md border border-[#ccc] bg-white px-2 py-0.5',
                    open && 'border-[#2684ff] shadow-[0_0_0_1px_#2684ff]',
                    disabled && 'cursor-default bg-[#e9ecef]',
                )}
                onClick={() => {
                    if (!disabled) {
                        input.current?.focus();
                        setOpen(true);
                    }
                }}
            >
                {chosen.map((team) => (
                    <span key={team.number} className="flex items-center rounded-sm bg-[#e6e6e6] text-[85%]">
                        <span className="px-1.5 py-0.5">{team.name ? optionLabel(team) : team.number}</span>
                        {!disabled && (
                            <button
                                type="button"
                                aria-label={`Remove ${team.number}`}
                                className="rounded-r-sm px-1 py-1 hover:bg-[#ffbdad] hover:text-[#de350b]"
                                onClick={() => onChange(selected.filter((number) => number !== String(team.number)))}
                            >
                                <X className="size-3.5" />
                            </button>
                        )}
                    </span>
                ))}
                <input
                    ref={input}
                    id={id}
                    type="text"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={`${id}-options`}
                    autoComplete="off"
                    className="min-w-16 flex-1 border-0 bg-transparent p-1 outline-none placeholder:text-[#808080]"
                    placeholder={selected.length === 0 ? 'Select...' : ''}
                    disabled={disabled}
                    value={search}
                    onFocus={() => setOpen(true)}
                    onChange={(changeEvent) => {
                        setSearch(changeEvent.target.value);
                        setHighlighted(0);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                />
                <span className="border-l border-[#ccc] pl-2 text-[#ccc]">
                    <ChevronDown className="size-5" />
                </span>
            </div>
            {open && !disabled && (
                <ul
                    id={`${id}-options`}
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-black/10 bg-white py-1 shadow-lg"
                >
                    {options.length === 0 && <li className="px-3 py-2 text-center text-[#999]">No options</li>}
                    {options.map((team, index) => (
                        <li
                            key={team.id}
                            role="option"
                            aria-selected={index === highlighted}
                            className={cn('cursor-pointer px-3 py-2', index === highlighted && 'bg-[#deebff]')}
                            onMouseEnter={() => setHighlighted(index)}
                            onMouseDown={(mouseEvent) => {
                                mouseEvent.preventDefault();
                                add(team);
                            }}
                        >
                            {optionLabel(team)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
