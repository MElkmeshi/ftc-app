import { type SoundName } from '@/hooks/use-audio-engine';
import { useFieldCount } from '@/hooks/use-field-count';
import { DEFAULT_OVERLAY_COLOR, type DisplayConfig, type DisplayType, displayTypeOption } from '@/lib/display-config';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown, Settings, X } from 'lucide-react';
import { type CSSProperties, type ReactNode, type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react';

const CURSOR_IDLE_MS = 3000;

type ScreenType = Exclude<DisplayType, 'overlay'>;
type Section = 'audio' | 'display' | 'overlay' | 'advanced';

const SCREEN_TYPES: { value: ScreenType; label: string }[] = [
    { value: 'audience', label: 'Audience' },
    { value: 'field', label: 'Field' },
    { value: 'pit', label: 'Pit' },
    { value: 'sponsor', label: 'Sponsor' },
];

const TEST_SOUNDS: { value: SoundName; label: string }[] = [
    { value: 'match_start_whistle.wav', label: 'MATCH start' },
    { value: 'auto_end_ftc.wav', label: 'AUTO end' },
    { value: 'controllers_pickup.wav', label: 'Pick Up Controllers' },
    { value: 'countdown.wav', label: '3-2-1' },
    { value: 'endgame_whistle.wav', label: 'End of MATCH Warning' },
    { value: 'end_match.wav', label: 'MATCH end' },
    { value: 'canel_match.wav', label: 'MATCH abort' },
];

const selectClass =
    'w-full appearance-none rounded-[0.375rem] border border-[#dee2e6] bg-white bg-no-repeat py-1.5 pr-9 pl-3 text-[#212529] focus:border-[#86b7fe] focus:ring-4 focus:ring-[#0d6efd]/25 focus:outline-none';
const selectStyle: CSSProperties = {
    backgroundImage:
        "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e\")",
    backgroundPosition: 'right 0.75rem center',
    backgroundSize: '16px 12px',
};
const inputClass =
    'w-full rounded-[0.375rem] border border-[#dee2e6] bg-white px-3 py-1.5 text-[#212529] focus:border-[#86b7fe] focus:outline-none focus:ring-4 focus:ring-[#0d6efd]/25';
const buttonClass = 'rounded-[0.375rem] border px-3 py-1.5 leading-normal disabled:opacity-65';
const smallButtonClass = 'rounded-[0.25rem] border border-[#6c757d] bg-[#6c757d] px-2 py-1 text-sm text-white hover:bg-[#5c636a]';

function useCursorMovedRecently(): boolean {
    const [moved, setMoved] = useState(false);

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout> | undefined;

        const onMove = () => {
            setMoved(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setMoved(false), CURSOR_IDLE_MS);
        };

        window.addEventListener('mousemove', onMove);

        return () => {
            window.removeEventListener('mousemove', onMove);
            clearTimeout(timeout);
        };
    }, []);

    return moved;
}

function AccordionItem({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
    return (
        <div className="border-b border-[#dee2e6] last:border-b-0">
            <h2>
                <button
                    type="button"
                    aria-expanded={open}
                    onClick={onToggle}
                    className={cn(
                        'flex w-full items-center justify-between px-5 py-4 text-left text-base',
                        open ? 'bg-[#cfe2ff] text-[#052c65] shadow-[inset_0_-1px_0_#dee2e6]' : 'bg-white text-[#212529]',
                    )}
                >
                    {title}
                    <ChevronDown className={cn('size-5 transition-transform', open && 'rotate-180')} strokeWidth={1.5} />
                </button>
            </h2>
            {open && <div className="px-5 py-4">{children}</div>}
        </div>
    );
}

function FormRow({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[1fr_2fr] items-center">
            <label htmlFor={htmlFor}>{label}</label>
            {children}
        </div>
    );
}

function Check({
    id,
    label,
    checked,
    onChange,
    type = 'checkbox',
}: {
    id: string;
    label: string;
    checked: boolean;
    onChange: () => void;
    type?: 'checkbox' | 'radio';
}) {
    return (
        <div className="flex items-center gap-2">
            <input id={id} type={type} checked={checked} onChange={onChange} className="size-4 accent-[#0d6efd]" />
            <label htmlFor={id}>{label}</label>
        </div>
    );
}

/**
 * FTC Live's Display Options for one screen: what it shows, how, and its
 * sound, in an accordion that can be dragged aside to see the screen behind.
 * Used by the gear on the screen itself and by match control to change a
 * screen remotely.
 */
export function DisplaySettingsDialog({
    open,
    onOpenChange,
    config,
    onSave,
    subtitle,
    playSound,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: DisplayConfig;
    onSave: (config: DisplayConfig) => void;
    subtitle?: string;
    playSound?: (name: SoundName) => void;
}) {
    const { event } = usePage<SharedData>().props;
    const fieldCount = useFieldCount();
    const [draft, setDraft] = useState(config);
    const [section, setSection] = useState<Section | null>('display');
    const [testSound, setTestSound] = useState<SoundName>(TEST_SOUNDS[0].value);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [overlayBase, setOverlayBase] = useState<'audience' | 'field'>('audience');
    const colorInput = useRef<HTMLInputElement>(null);

    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setDraft(config);
        }
    }

    useEffect(() => {
        if (!open) {
            return;
        }

        const onKey = (keyEvent: KeyboardEvent) => keyEvent.key === 'Escape' && onOpenChange(false);
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [open, onOpenChange]);

    if (!open) {
        return null;
    }

    const usesOverlay = draft.type === 'overlay';
    const screenType: ScreenType = draft.type === 'overlay' ? overlayBase : draft.type;
    const hasTimer = screenType === 'audience' || screenType === 'field';
    const option = displayTypeOption(draft.type);
    const toggle = (next: Section) => setSection(section === next ? null : next);

    const startDrag = (pointerEvent: ReactPointerEvent<HTMLDivElement>) => {
        if ((pointerEvent.target as HTMLElement).closest('button')) {
            return;
        }

        const start = { x: pointerEvent.clientX - offset.x, y: pointerEvent.clientY - offset.y };
        const onMove = (moveEvent: PointerEvent) => setOffset({ x: moveEvent.clientX - start.x, y: moveEvent.clientY - start.y });
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void document.documentElement.requestFullscreen?.().catch(() => undefined);
        }
    };

    return (
        <div
            role="dialog"
            aria-labelledby="display-options-title"
            className="fixed top-7 left-1/2 z-50 w-[calc(100%-1rem)] max-w-[800px] rounded-[0.5rem] border border-black/[0.175] bg-white text-base text-[#212529]"
            style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
        >
            <div className="flex cursor-move items-center justify-between border-b border-[#dee2e6] p-4 select-none" onPointerDown={startDrag}>
                <h5 id="display-options-title" className="text-xl leading-normal font-medium">
                    Display Options
                    {(subtitle ?? event?.name) && <span className="ml-2 text-xl">[{subtitle ?? event?.name}]</span>}
                </h5>
                <button type="button" aria-label="Close" onClick={() => onOpenChange(false)} className="text-[#212529]/50 hover:text-[#212529]">
                    <X className="size-6" />
                </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-4">
                <div className="overflow-hidden rounded-[0.375rem] border border-[#dee2e6]">
                    {playSound && option.playsSound && (
                        <AccordionItem title="Audio Testing" open={section === 'audio'} onToggle={() => toggle('audio')}>
                            <div className="flex items-center gap-2">
                                <select
                                    aria-label="Sound to test"
                                    value={testSound}
                                    onChange={(changeEvent) => setTestSound(changeEvent.target.value as SoundName)}
                                    className="rounded-sm border border-[#767676] bg-white px-1 text-sm"
                                >
                                    {TEST_SOUNDS.map((sound) => (
                                        <option key={sound.value} value={sound.value}>
                                            {sound.label}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" className={smallButtonClass} onClick={() => playSound(testSound)}>
                                    Play
                                </button>
                            </div>
                        </AccordionItem>
                    )}

                    <AccordionItem title="Display Settings" open={section === 'display'} onToggle={() => toggle('display')}>
                        <div className="grid gap-1">
                            <FormRow label="Display Name" htmlFor="display-name">
                                <input
                                    id="display-name"
                                    maxLength={40}
                                    value={draft.name ?? ''}
                                    onChange={(changeEvent) => setDraft({ ...draft, name: changeEvent.target.value || null })}
                                    className={inputClass}
                                />
                            </FormRow>
                            <FormRow label="Display Type" htmlFor="display-type">
                                <select
                                    id="display-type"
                                    value={screenType}
                                    onChange={(changeEvent) => {
                                        const next = changeEvent.target.value as ScreenType;
                                        const keepsOverlay = usesOverlay && (next === 'audience' || next === 'field');
                                        if (keepsOverlay) {
                                            setOverlayBase(next);
                                        }
                                        setDraft({ ...draft, type: keepsOverlay ? 'overlay' : next });
                                    }}
                                    className={selectClass}
                                    style={selectStyle}
                                >
                                    {SCREEN_TYPES.map((type) => (
                                        <option key={type.value} value={type.value}>
                                            {type.label}
                                        </option>
                                    ))}
                                </select>
                            </FormRow>
                            {screenType === 'field' && !usesOverlay && fieldCount > 1 && (
                                <FormRow label="Bind to Field" htmlFor="display-field">
                                    <select
                                        id="display-field"
                                        value={draft.field ?? 'all'}
                                        onChange={(changeEvent) =>
                                            setDraft({
                                                ...draft,
                                                field: changeEvent.target.value === 'all' ? null : Number(changeEvent.target.value),
                                            })
                                        }
                                        className={selectClass}
                                        style={selectStyle}
                                    >
                                        <option value="all">(All)</option>
                                        {Array.from({ length: fieldCount }, (_, index) => index + 1).map((field) => (
                                            <option key={field} value={field}>
                                                Field {field}
                                            </option>
                                        ))}
                                    </select>
                                </FormRow>
                            )}
                            {hasTimer && (
                                <fieldset className="mt-1">
                                    <legend className="mb-2">Timer/Overlay Configuration</legend>
                                    <div className="grid gap-1 pl-6">
                                        <Check
                                            id="display-field-timer"
                                            type="radio"
                                            label="Use field-style timer (with a big timer in the middle of the screen)"
                                            checked={!usesOverlay}
                                            onChange={() => setDraft({ ...draft, type: overlayBase })}
                                        />
                                        <Check
                                            id="display-overlay"
                                            type="radio"
                                            label="Use Overlay"
                                            checked={usesOverlay}
                                            onChange={() => {
                                                setOverlayBase(screenType === 'field' ? 'field' : 'audience');
                                                setDraft({ ...draft, type: 'overlay' });
                                            }}
                                        />
                                    </div>
                                </fieldset>
                            )}
                        </div>
                    </AccordionItem>

                    {usesOverlay && (
                        <AccordionItem title="Overlay Settings" open={section === 'overlay'} onToggle={() => toggle('overlay')}>
                            <div className="flex items-center gap-2">
                                <button type="button" className={smallButtonClass} onClick={() => colorInput.current?.click()}>
                                    Pick Color
                                </button>
                                <span
                                    aria-label="Overlay colour"
                                    className="inline-block size-8 border border-black/10"
                                    style={{ backgroundColor: draft.color ?? DEFAULT_OVERLAY_COLOR }}
                                />
                                <input
                                    ref={colorInput}
                                    type="color"
                                    aria-label="Overlay colour picker"
                                    className="sr-only"
                                    value={draft.color ?? DEFAULT_OVERLAY_COLOR}
                                    onChange={(changeEvent) => setDraft({ ...draft, color: changeEvent.target.value })}
                                />
                            </div>
                        </AccordionItem>
                    )}

                    {(option.canFlip || option.playsSound) && (
                        <AccordionItem title="Advanced Settings" open={section === 'advanced'} onToggle={() => toggle('advanced')}>
                            <div className="grid gap-1">
                                {option.canFlip && (
                                    <FormRow label="Alliance Orientation" htmlFor="display-orientation">
                                        <select
                                            id="display-orientation"
                                            value={draft.flipped ? 'flipped' : 'standard'}
                                            onChange={(changeEvent) => setDraft({ ...draft, flipped: changeEvent.target.value === 'flipped' })}
                                            className={selectClass}
                                            style={selectStyle}
                                        >
                                            <option value="standard">Standard (Red on Left)</option>
                                            <option value="flipped">Flipped (Red on Right)</option>
                                        </select>
                                    </FormRow>
                                )}
                                {option.playsSound && (
                                    <Check
                                        id="display-mute"
                                        label="Mute"
                                        checked={draft.mute}
                                        onChange={() => setDraft({ ...draft, mute: !draft.mute })}
                                    />
                                )}
                            </div>
                        </AccordionItem>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#dee2e6] p-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className={cn(buttonClass, 'border-[#212529] bg-[#212529] text-white hover:bg-[#424649]')}
                    >
                        Fullscreen
                    </button>
                    <button
                        type="button"
                        onClick={() => setOffset({ x: 0, y: 0 })}
                        className={cn(buttonClass, 'border-[#6c757d] bg-white text-[#6c757d] hover:bg-[#6c757d] hover:text-white')}
                    >
                        Recenter
                    </button>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onOpenChange(false)}
                        className={cn(buttonClass, 'border-[#6c757d] bg-[#6c757d] text-white hover:bg-[#5c636a]')}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={() => onSave(draft)}
                        className={cn(buttonClass, 'border-[#0d6efd] bg-[#0d6efd] text-white hover:bg-[#0b5ed7]')}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * FTC Live's gear in the corner of every display. It fades in when someone
 * moves the mouse (Ctrl or Shift + click also opens the options) and lets
 * that one screen choose what it shows.
 */
export function DisplaySettings({
    config,
    onChange,
    defaultOpen,
    playSound,
}: {
    config: DisplayConfig;
    onChange: (config: DisplayConfig) => void;
    defaultOpen: boolean;
    playSound?: (name: SoundName) => void;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const cursorMoved = useCursorMovedRecently();

    useEffect(() => {
        if (open) {
            return;
        }

        const onClick = (clickEvent: MouseEvent) => (clickEvent.ctrlKey || clickEvent.shiftKey) && setOpen(true);
        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, [open]);

    return (
        <>
            <button
                type="button"
                aria-label="Configure display"
                title="Configure display"
                onClick={() => setOpen(true)}
                className={cn(
                    'fixed top-[2vmin] right-[2vmin] z-50 rounded-[2.7vmin] border-[0.25vmin] border-[#f7f6f6] bg-[#232323] p-[0.5vmin] leading-none text-[#f7f6f6] transition-opacity duration-1000',
                    cursorMoved && !open ? 'opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <Settings className="size-6" />
            </button>

            <DisplaySettingsDialog
                open={open}
                onOpenChange={setOpen}
                config={config}
                playSound={playSound}
                onSave={(next) => {
                    onChange(next);
                    setOpen(false);
                }}
            />
        </>
    );
}
