import { type AwardTeam, teamLabel } from '@/lib/award-utils';
import { cn } from '@/lib/utils';
import { ChevronDown, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';

function matches(team: AwardTeam, search: string): boolean {
    const wanted = search.trim().toLowerCase();

    return wanted === '' || teamLabel(team).toLowerCase().includes(wanted);
}

/**
 * The team box on FTC Live's Enter Awards page: one team picked from a
 * searchable list of the event's teams, with a cross to clear it.
 */
export function TeamSelect({
    id,
    label,
    teams,
    value,
    disabled = false,
    onChange,
}: {
    id: string;
    label: string;
    teams: AwardTeam[];
    value: AwardTeam | null;
    disabled?: boolean;
    onChange: (team: AwardTeam | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [search, setSearch] = useState('');
    const [highlighted, setHighlighted] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const list = useRef<HTMLDivElement>(null);
    const options = teams.filter((team) => matches(team, search));
    const listId = `${id}-options`;

    useEffect(() => {
        if (open) {
            list.current?.parentElement?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
        }
    }, [open]);

    useEffect(() => {
        const menu = list.current;
        const option = menu?.querySelector<HTMLElement>('[data-highlighted="true"]');

        if (!open || !menu || !option) {
            return;
        }

        if (option.offsetTop < menu.scrollTop) {
            menu.scrollTop = option.offsetTop;
        } else if (option.offsetTop + option.offsetHeight > menu.scrollTop + menu.clientHeight) {
            menu.scrollTop = option.offsetTop + option.offsetHeight - menu.clientHeight;
        }
    }, [open, highlighted]);

    const openMenu = (start: 'first' | 'last' = 'first') => {
        const selected = teams.findIndex((team) => team.id === value?.id);

        setHighlighted(selected >= 0 ? selected : start === 'last' ? teams.length - 1 : 0);
        setOpen(true);
    };

    const closeMenu = () => {
        setOpen(false);
        setSearch('');
    };

    const choose = (team: AwardTeam | null) => {
        closeMenu();

        if (team?.id !== value?.id) {
            onChange(team);
        }
    };

    const move = (step: 1 | -1) => {
        if (!open) {
            openMenu(step === 1 ? 'first' : 'last');
        } else if (options.length > 0) {
            setHighlighted((current) => (current + step + options.length) % options.length);
        }
    };

    const onKeyDown = (keyEvent: KeyboardEvent<HTMLInputElement>) => {
        if (keyEvent.key === 'ArrowDown' || keyEvent.key === 'ArrowUp') {
            keyEvent.preventDefault();
            move(keyEvent.key === 'ArrowDown' ? 1 : -1);
        } else if ((keyEvent.key === 'Enter' || keyEvent.key === 'Tab') && open && options[highlighted]) {
            if (keyEvent.key === 'Enter') {
                keyEvent.preventDefault();
            }

            choose(options[highlighted]);
        } else if (keyEvent.key === 'Escape' && open) {
            keyEvent.preventDefault();
            closeMenu();
        } else if ((keyEvent.key === 'Backspace' || keyEvent.key === 'Delete') && search === '' && value) {
            keyEvent.preventDefault();
            choose(null);
        }
    };

    return (
        <div className="relative">
            <div
                className={cn(
                    'flex min-h-[38px] cursor-default items-center justify-between rounded border bg-white',
                    disabled
                        ? 'pointer-events-none border-[#e6e6e6] bg-[#f2f2f2]'
                        : focused
                          ? 'border-[#2684ff] shadow-[0_0_0_1px_#2684ff]'
                          : 'border-[#ccc] hover:border-[#b3b3b3]',
                )}
                onMouseDown={(mouseEvent) => {
                    if (mouseEvent.button !== 0) {
                        return;
                    }

                    if (mouseEvent.target !== input.current) {
                        mouseEvent.preventDefault();
                    }

                    input.current?.focus();

                    if (!open) {
                        openMenu();
                    } else if (search === '') {
                        closeMenu();
                    }
                }}
            >
                <div className="relative grid flex-1 items-center overflow-hidden px-2 py-0.5">
                    {search === '' && (
                        <div
                            data-slot="value"
                            className={cn(
                                'col-start-1 row-start-1 mx-0.5 truncate',
                                value ? (disabled ? 'text-[#999]' : 'text-[#333]') : 'text-[#808080]',
                            )}
                        >
                            {value ? teamLabel(value) : 'Select...'}
                        </div>
                    )}
                    <input
                        ref={input}
                        id={id}
                        type="text"
                        role="combobox"
                        aria-label={label}
                        aria-autocomplete="list"
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-activedescendant={open && options[highlighted] ? `${id}-option-${options[highlighted].id}` : undefined}
                        autoComplete="off"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className="col-start-1 row-start-1 m-0.5 w-full min-w-0.5 border-0 bg-transparent py-0.5 text-[#333] outline-none"
                        disabled={disabled}
                        value={search}
                        onFocus={() => setFocused(true)}
                        onBlur={() => {
                            setFocused(false);
                            closeMenu();
                        }}
                        onChange={(changeEvent) => {
                            setSearch(changeEvent.target.value);
                            setHighlighted(0);
                            setOpen(true);
                        }}
                        onKeyDown={onKeyDown}
                    />
                </div>
                <div className="flex shrink-0 items-center self-stretch">
                    {value && !disabled && (
                        <div
                            role="button"
                            aria-label={`Clear ${label}`}
                            className={cn('flex p-2', focused ? 'text-[#666] hover:text-[#333]' : 'text-[#ccc] hover:text-[#999]')}
                            onMouseDown={(mouseEvent) => {
                                mouseEvent.preventDefault();
                                mouseEvent.stopPropagation();
                                input.current?.focus();
                                choose(null);
                            }}
                        >
                            <X className="size-5" strokeWidth={2.5} />
                        </div>
                    )}
                    <span className={cn('my-2 w-px self-stretch', disabled ? 'bg-[#e6e6e6]' : 'bg-[#ccc]')} />
                    <div aria-hidden className={cn('flex p-2', focused ? 'text-[#666] hover:text-[#333]' : 'text-[#ccc] hover:text-[#999]')}>
                        <ChevronDown className="size-5" strokeWidth={2.5} />
                    </div>
                </div>
            </div>
            {open && !disabled && (
                <div
                    className="absolute top-full z-10 my-2 w-full rounded bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.1),0_4px_11px_rgba(0,0,0,0.1)]"
                    onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                >
                    <div ref={list} id={listId} role="listbox" aria-label={label} className="relative max-h-[300px] overflow-y-auto py-1">
                        {options.length === 0 && <div className="px-3 py-2 text-center text-[#999]">No options</div>}
                        {options.map((team, index) => {
                            const selected = team.id === value?.id;

                            return (
                                <div
                                    key={team.id}
                                    id={`${id}-option-${team.id}`}
                                    role="option"
                                    aria-selected={selected}
                                    data-highlighted={index === highlighted}
                                    className={cn(
                                        'cursor-default px-3 py-2',
                                        selected
                                            ? 'bg-[#2684ff] text-white'
                                            : index === highlighted
                                              ? 'bg-[#deebff] active:bg-[#b2d4ff]'
                                              : 'active:bg-[#b2d4ff]',
                                    )}
                                    onMouseMove={() => setHighlighted(index)}
                                    onClick={() => choose(team)}
                                >
                                    {teamLabel(team)}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
