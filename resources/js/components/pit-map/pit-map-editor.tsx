import { ImportDialog, NoticeDialog, type NoticeRequest, PromptDialog, type PromptRequest } from '@/components/pit-map/pit-map-dialogs';
import PitTeamTable from '@/components/pit-map/pit-team-table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { bs } from '@/lib/bootstrap';
import {
    type AssignError,
    type AutoAssignOrder,
    autoAssignTeams,
    CellType,
    clearTeams,
    Cursor,
    DEFAULT_PIT_COLOR,
    exportPayload,
    fitZoom,
    mergeTeamsAndPits,
    nextQuickAddress,
    nextZoom,
    parseImport,
    PitLabelMode,
    PitMapCanvas,
    type PitMapConfig,
    type PitObject,
    type PitTeam,
    setPitAddress,
    setPitColor,
    setPitTeam,
    type ShiftDirection,
    swapPitNumber,
    usedPitColors,
    type ZoomAction,
} from '@/lib/pit-map';
import { cn } from '@/lib/utils';
import { Link, router } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Crosshair,
    Hand,
    Info,
    type LucideIcon,
    MousePointer2,
    Repeat,
    RotateCcw,
    TextCursor,
    Trash2,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useReducer, useRef, useState } from 'react';

type Mode = 'EDIT' | 'ASSIGN';

interface PitMapEditorProps {
    mode: Mode;
    eventCode: string;
    objects: PitObject[];
    config?: PitMapConfig;
    teams?: PitTeam[];
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const toolButton = 'inline-flex h-[38px] w-[42px] items-center justify-center px-0 align-middle';

const CELL_TYPES: { type: CellType; label: string; fillable: boolean }[] = [
    { type: CellType.OPEN, label: 'Open', fillable: true },
    { type: CellType.BOUNDARY, label: 'Boundary', fillable: true },
    { type: CellType.PIT, label: 'Pit', fillable: true },
    { type: CellType.FIELD, label: 'Field', fillable: false },
    { type: CellType.FIELD_ROT, label: 'Field (rotated)', fillable: false },
    { type: CellType.OBJECT, label: 'Object', fillable: true },
    { type: CellType.LABEL, label: 'Label', fillable: true },
];

const LABEL_MODES: { mode: PitLabelMode; label: string }[] = [
    { mode: PitLabelMode.NUMBER, label: 'Number' },
    { mode: PitLabelMode.ADDRESS, label: 'Address' },
    { mode: PitLabelMode.TEAM, label: 'Team' },
    { mode: PitLabelMode.COLOR, label: 'Color' },
];

const SHIFT_BUTTONS: { direction: ShiftDirection; icon: LucideIcon; width: string }[] = [
    { direction: 'up', icon: ArrowUp, width: 'w-[38px]' },
    { direction: 'down', icon: ArrowDown, width: 'w-[38px]' },
    { direction: 'left', icon: ArrowLeft, width: 'w-[40px]' },
    { direction: 'right', icon: ArrowRight, width: 'w-[40px]' },
];

const AUTO_ASSIGN: { order: AutoAssignOrder; label: string }[] = [
    { order: 'ascending', label: 'In Order (Ascending)' },
    { order: 'descending', label: 'In Order  (Descending)' },
    { order: 'random', label: 'Random' },
];

function ToolbarGroup({ label, children }: { label?: ReactNode; children: ReactNode }) {
    return (
        <div className="toolbarGroup whitespace-nowrap">
            {label !== undefined && <span className="m-[5px]">{label}</span>}
            {children}
        </div>
    );
}

function CursorButton({
    title,
    active,
    danger = false,
    className,
    onClick,
    children,
}: {
    title: string;
    active: boolean;
    danger?: boolean;
    className?: string;
    onClick: () => void;
    children: ReactNode;
}) {
    const style = danger ? (active ? bs.btnDanger : bs.btnOutlineDanger) : active ? bs.btnPrimary : bs.btnOutlinePrimary;

    return (
        <button type="button" title={title} aria-label={title} aria-pressed={active} className={cn(style, toolButton, className)} onClick={onClick}>
            {children}
        </button>
    );
}

function readableOn(color: string): string {
    const red = parseInt(color.slice(1, 3), 16);
    const green = parseInt(color.slice(3, 5), 16);
    const blue = parseInt(color.slice(5, 7), 16);

    return (red * 299 + green * 587 + blue * 114) / 1000 >= 128 ? '#000' : '#fff';
}

function ColorPicker({ color, used, onChange }: { color: string; used: string[]; onChange: (color: string) => void }) {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState(color);

    const type = (value: string) => {
        const hex = value.startsWith('#') ? value : `#${value}`;

        setTyped(value);

        if (HEX_COLOR.test(hex)) {
            onChange(hex.toLowerCase());
        }
    };

    const pick = (value: string) => {
        setTyped(value);
        onChange(value);
    };

    return (
        <div className="toolbarGroup relative whitespace-nowrap">
            <button type="button" className={cn(bs.btnSecondary, bs.btnSm, 'relative -top-2 ml-4')} onClick={() => setOpen(!open)}>
                {open ? 'Hide Picker' : 'Pick Color'}
            </button>
            <button
                type="button"
                aria-label="Chosen pit color"
                className="relative top-1 ml-2 inline-block size-[2em]"
                style={{ background: color }}
                onClick={() => setOpen(true)}
            />
            {open && (
                <div className="absolute z-[2] w-[170px] rounded-md bg-white shadow-[0_1px_rgba(0,0,0,0.1)]">
                    <div className="flex h-[110px] items-center justify-center rounded-t-md" style={{ background: color }}>
                        <span className="text-lg" style={{ color: readableOn(color) }}>
                            {color}
                        </span>
                    </div>
                    <div className="p-2.5">
                        <div className="-mr-2.5 flex flex-wrap">
                            {used.map((swatch) => (
                                <button
                                    key={swatch}
                                    type="button"
                                    title={swatch}
                                    aria-label={`Use ${swatch}`}
                                    className="mr-2.5 mb-2.5 size-[22px] rounded"
                                    style={{ background: swatch }}
                                    onClick={() => pick(swatch)}
                                />
                            ))}
                        </div>
                        <input
                            aria-label="Hex color"
                            spellCheck={false}
                            value={typed}
                            className="h-[22px] w-full rounded-sm border border-[#ddd] px-[5px] text-xs text-[#666] uppercase"
                            onChange={(event) => type(event.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PitMapEditor({ mode, eventCode, objects, config, teams = [] }: PitMapEditorProps) {
    const base = `/event/${eventCode}`;
    const assigning = mode === 'ASSIGN';
    const canvasElement = useRef<HTMLCanvasElement>(null);
    const container = useRef<HTMLDivElement>(null);
    const map = useRef<PitMapCanvas | null>(null);
    const saved = useRef<PitObject[]>(objects);
    const [preview, setPreview] = useState(false);
    const [cursor, setCursor] = useState<Cursor>(assigning ? Cursor.INSPECT : Cursor.POINTER);
    const [cellType, setCellType] = useState<CellType>(CellType.OPEN);
    const [labelMode, setLabelMode] = useState<PitLabelMode>(PitLabelMode.NUMBER);
    const [zoom, zoomDispatch] = useReducer((current: number, action: ZoomAction) => nextZoom(current, action), 1);
    const [settings, setSettings] = useState<PitMapConfig>(config ?? { numbers: true, addresses: true, published: false });
    const [color, setColor] = useState(DEFAULT_PIT_COLOR);
    const [usedColors, setUsedColors] = useState(() => usedPitColors(objects));
    const [group, setGroup] = useState('A');
    const [increment, setIncrement] = useState(1);
    const [live, setLive] = useState<PitObject[]>(objects);
    const [prompt, setPrompt] = useState<PromptRequest | null>(null);
    const [notice, setNotice] = useState<NoticeRequest | null>(null);
    const [importing, setImporting] = useState(false);
    const assignment = useRef({ color, group, increment });

    useEffect(() => {
        assignment.current = { color, group, increment };
    }, [color, group, increment]);

    const published = useCallback(() => {
        const current = map.current?.getObjects() ?? [];

        setLive(current);
        setUsedColors(usedPitColors(current));
    }, []);

    const showAssignError = useCallback((error: AssignError) => {
        setNotice({
            title: 'Assignment Error',
            body:
                error.kind === 'illegal-number'
                    ? `Pit number must be between 1 and ${error.max}. Invalid value: ${error.number}.`
                    : 'Several pits share that number. Clear the map numbering and try again.',
        });
    }, []);

    const choosePits = useCallback(
        (pits: PitObject[], chosenMode: PitLabelMode, chosenCursor: Cursor) => {
            const canvas = map.current;

            if (!canvas) {
                return;
            }

            const finish = () => {
                canvas.draw();
                published();
            };

            if (chosenCursor === Cursor.CLEAR) {
                if (chosenMode === PitLabelMode.ADDRESS) {
                    setPitAddress(pits, null);
                } else if (chosenMode === PitLabelMode.TEAM) {
                    pits.forEach((pit) => setPitTeam(pit, null));
                } else if (chosenMode === PitLabelMode.COLOR) {
                    setPitColor(pits, null);
                }

                finish();
            } else if (chosenMode === PitLabelMode.COLOR) {
                setPitColor(pits, assignment.current.color);
                finish();
            } else if (chosenMode === PitLabelMode.ADDRESS && chosenCursor === Cursor.SINGLE) {
                setPitAddress([pits[0]], nextQuickAddress(canvas.liveObjects(), assignment.current.group, assignment.current.increment || 1));
                finish();
            } else if (chosenMode === PitLabelMode.ADDRESS) {
                setPrompt({
                    title: 'Set Pit Address Group',
                    text: 'Set pit address:',
                    defaultValue: pits[0].address ?? '',
                    onDone: (value) => {
                        if (value !== null) {
                            setPitAddress(pits, value);
                            finish();
                        }
                    },
                });
            } else if (chosenMode === PitLabelMode.TEAM) {
                setPrompt({
                    title: 'Set Pit Team',
                    text: 'Set team:',
                    defaultValue: pits[0].team ? String(pits[0].team) : '',
                    onDone: (value) => {
                        if (value !== null) {
                            setPitTeam(pits[0], value);
                            finish();
                        }
                    },
                });
            } else {
                setPrompt({
                    title: 'Set Pit Number',
                    text: 'Set pit number:',
                    defaultValue: pits[0].label ?? '',
                    onDone: (value) => {
                        if (value === null) {
                            return;
                        }

                        const error = swapPitNumber(canvas.liveObjects(), pits[0], value);

                        if (error) {
                            showAssignError(error);
                        } else {
                            finish();
                        }
                    },
                });
            }
        },
        [published, showAssignError],
    );

    const handlers = useRef({ choosePits });

    useEffect(() => {
        handlers.current = { choosePits };
    }, [choosePits]);

    useEffect(() => {
        if (!canvasElement.current) {
            return;
        }

        const canvas = new PitMapCanvas({
            canvas: canvasElement.current,
            fitToContent: assigning,
            onLabelRequest: (object, rotated, apply) =>
                setPrompt({
                    title: `Map Object Label${rotated ? ' (rotated)' : ''}`,
                    text: 'Set label for selected object:',
                    defaultValue: object.label ?? '',
                    onDone: (value) => apply(value),
                }),
            onPitClick: (pit) =>
                setNotice({
                    title: 'Pit Info',
                    body: (
                        <>
                            Pit Number: {pit.label}
                            <br />
                            Pit Address: {pit.address ?? <em>Not Set</em>}
                            <br />
                            Assigned Team: {pit.team ?? <em>Not Set</em>}
                            <br />
                            Color: <code className="text-[#d63384]">{pit.color ?? DEFAULT_PIT_COLOR}</code>
                        </>
                    ),
                }),
            onPitsChosen: (pits, chosenMode, chosenCursor) => handlers.current.choosePits(pits, chosenMode, chosenCursor),
        });

        map.current = canvas;
        canvas.setData(saved.current);

        if (assigning) {
            canvas.setAssigning(true);
            zoomDispatch({ set: fitZoom(container.current?.clientWidth ?? 0, canvas.getBoundingBox().w) });
        } else {
            canvas.setEditing(true);
        }

        const redraw = () => canvas.draw();
        const warn = (event: BeforeUnloadEvent) => {
            if (JSON.stringify(canvas.getObjects()) !== JSON.stringify(saved.current)) {
                event.preventDefault();
            }
        };

        window.addEventListener('resize', redraw);
        window.addEventListener('beforeunload', warn);

        return () => {
            window.removeEventListener('resize', redraw);
            window.removeEventListener('beforeunload', warn);
            canvas.destroy();
            map.current = null;
        };
    }, [assigning]);

    useEffect(() => map.current?.setEditing(!assigning && !preview), [assigning, preview]);
    useEffect(() => map.current?.setCursor(cursor), [cursor]);
    useEffect(() => map.current?.setZoom(zoom), [zoom]);
    useEffect(() => map.current?.setPitLabelMode(labelMode), [labelMode]);

    const chooseCellType = (type: CellType) => {
        setCellType(type);
        map.current?.setCellType(type);
    };

    const chooseLabelMode = (next: PitLabelMode) => {
        setLabelMode(next);

        if ((next !== PitLabelMode.ADDRESS && cursor === Cursor.SINGLE) || (next === PitLabelMode.NUMBER && cursor === Cursor.CLEAR)) {
            setCursor(Cursor.ASSIGN);
        }
    };

    const store = (next: PitObject[], onStored: () => void) => {
        router.post(`${base}/pit-map`, { objects: next } as never, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                saved.current = next;
                onStored();
            },
            onError: () => setNotice({ title: 'Error', body: 'Error saving pit map' }),
        });
    };

    const save = () => store(map.current?.getObjects() ?? [], () => undefined);

    const upload = (file: File) => {
        setImporting(false);
        file.text().then((text) => {
            const imported = parseImport(text);

            if (imported === null) {
                setNotice({ title: 'Error', body: 'File must be a pitmap file' });

                return;
            }

            store(imported, () => {
                map.current?.setData(imported);
                saved.current = map.current?.getObjects() ?? imported;
                published();
            });
        });
    };

    const download = () => {
        const link = document.createElement('a');

        link.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportPayload(map.current?.getObjects() ?? [])))}`;
        link.download = `${eventCode}.pitmap2`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const clear = () => {
        const canvas = map.current;

        if (!canvas) {
            return;
        }

        if (assigning) {
            clearTeams(canvas.liveObjects());
            canvas.draw();
        } else {
            canvas.setData([]);
        }

        published();
    };

    const reset = () => {
        map.current?.setData(saved.current);
        published();
    };

    const autoAssign = (order: AutoAssignOrder) => {
        const canvas = map.current;

        if (!canvas) {
            return;
        }

        autoAssignTeams(
            canvas.liveObjects(),
            teams.map((team) => team.number),
            order,
        );
        canvas.draw();
        published();
    };

    const configure = (change: Partial<PitMapConfig>) => {
        const next = { ...settings, ...change };

        setSettings(next);
        router.post(`${base}/pit-map/config`, next as never, {
            preserveScroll: true,
            preserveState: true,
            onError: () => setNotice({ title: 'Error', body: 'Error saving config' }),
        });
    };

    const placing = cursor === Cursor.SINGLE || cursor === Cursor.FILL;

    const zoomGroup = (
        <ToolbarGroup label={`Zoom:${(zoom * 100).toFixed(0)}%`}>
            <button type="button" aria-label="Zoom out" className={cn(bs.btnOutlinePrimary, toolButton)} onClick={() => zoomDispatch('out')}>
                <ZoomOut className="size-4" strokeWidth={3} />
            </button>
            <button type="button" aria-label="Zoom in" className={cn(bs.btnOutlinePrimary, toolButton)} onClick={() => zoomDispatch('in')}>
                <ZoomIn className="size-4" strokeWidth={3} />
            </button>
        </ToolbarGroup>
    );

    return (
        <div id="pitMapContent" ref={container}>
            {assigning ? (
                <div className="toolbar flex flex-wrap bg-[#eee] p-[5px]">
                    <ToolbarGroup label="Cursor:">
                        <CursorButton
                            title="Assign Value(s)"
                            className="w-[36px]"
                            active={cursor === Cursor.ASSIGN}
                            onClick={() => setCursor(Cursor.ASSIGN)}
                        >
                            <MousePointer2 className="size-4 fill-current" />
                        </CursorButton>
                        {labelMode === PitLabelMode.ADDRESS && (
                            <CursorButton title="Quick Assign" active={cursor === Cursor.SINGLE} onClick={() => setCursor(Cursor.SINGLE)}>
                                <MousePointer2 className="size-3 fill-current" />
                                <sup>+</sup>
                            </CursorButton>
                        )}
                        {labelMode !== PitLabelMode.NUMBER && (
                            <CursorButton
                                title="Delete"
                                className="w-[36px]"
                                active={cursor === Cursor.CLEAR}
                                onClick={() => setCursor(Cursor.CLEAR)}
                            >
                                <Trash2 className="size-3 fill-current" />
                            </CursorButton>
                        )}
                        <CursorButton title="Pit Info" active={cursor === Cursor.INSPECT} onClick={() => setCursor(Cursor.INSPECT)}>
                            <Info className="size-4" />
                        </CursorButton>
                    </ToolbarGroup>
                    <ToolbarGroup label="Pit Label:">
                        {LABEL_MODES.map((entry) => (
                            <button
                                key={entry.mode}
                                type="button"
                                aria-pressed={labelMode === entry.mode}
                                className={labelMode === entry.mode ? bs.btnPrimary : bs.btnOutlinePrimary}
                                onClick={() => chooseLabelMode(entry.mode)}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </ToolbarGroup>
                    {zoomGroup}
                    {labelMode === PitLabelMode.COLOR && <ColorPicker color={color} used={usedColors} onChange={setColor} />}
                    {labelMode === PitLabelMode.ADDRESS && cursor === Cursor.SINGLE && (
                        <ToolbarGroup>
                            <span className="m-[5px]">Prefix:</span>
                            <input
                                aria-label="Prefix"
                                className={cn(bs.formControl, 'inline-block w-[6ch]')}
                                value={group}
                                onChange={(event) => setGroup(event.target.value)}
                            />
                            <span className="m-[5px]">Increment:</span>
                            <input
                                aria-label="Increment"
                                type="number"
                                className={cn(bs.formControl, 'inline-block w-[7ch]')}
                                value={Number.isNaN(increment) ? '' : increment}
                                onChange={(event) => setIncrement(parseInt(event.target.value, 10))}
                            />
                        </ToolbarGroup>
                    )}
                </div>
            ) : (
                <div className="toolbar flex flex-wrap bg-[#eee] p-[5px]">
                    <ToolbarGroup label="Cursor:">
                        <CursorButton
                            title="Select / Group Move"
                            className="w-[36px]"
                            active={cursor === Cursor.POINTER}
                            onClick={() => setCursor(Cursor.POINTER)}
                        >
                            <MousePointer2 className="size-4 fill-current" />
                        </CursorButton>
                        <CursorButton title="Single Place" active={cursor === Cursor.SINGLE} onClick={() => setCursor(Cursor.SINGLE)}>
                            <MousePointer2 className="size-3 fill-current" />
                            <sup>+</sup>
                        </CursorButton>
                        <CursorButton title="Fill Area" active={cursor === Cursor.FILL} onClick={() => setCursor(Cursor.FILL)}>
                            <Crosshair className="size-4" strokeWidth={3} />
                        </CursorButton>
                        <CursorButton title="Single Grab & Move" active={cursor === Cursor.GRAB} onClick={() => setCursor(Cursor.GRAB)}>
                            <Hand className="size-4 fill-current" />
                        </CursorButton>
                        <CursorButton title="Label" className="w-[35px]" active={cursor === Cursor.TEXT} onClick={() => setCursor(Cursor.TEXT)}>
                            <TextCursor className="size-4" strokeWidth={3} />
                        </CursorButton>
                        <CursorButton
                            title="Label (rot)"
                            className="w-[33px]"
                            active={cursor === Cursor.TEXT_ROT}
                            onClick={() => setCursor(Cursor.TEXT_ROT)}
                        >
                            <TextCursor className="size-4 rotate-90" strokeWidth={3} />
                        </CursorButton>
                        <CursorButton
                            title="Delete"
                            danger
                            className="w-[40px]"
                            active={cursor === Cursor.DELETE}
                            onClick={() => setCursor(Cursor.DELETE)}
                        >
                            <Trash2 className="size-4 fill-current" />
                        </CursorButton>
                    </ToolbarGroup>
                    <ToolbarGroup label="Cell Type:">
                        {CELL_TYPES.map((entry) => (
                            <button
                                key={entry.type}
                                type="button"
                                className={cursor === Cursor.SINGLE && cellType === entry.type ? bs.btnPrimary : bs.btnOutlinePrimary}
                                disabled={!placing || (cursor === Cursor.FILL && !entry.fillable)}
                                onClick={() => chooseCellType(entry.type)}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </ToolbarGroup>
                    <ToolbarGroup label="Undo:">
                        <button type="button" aria-label="Undo" className={cn(bs.btnOutlinePrimary, toolButton)} onClick={() => map.current?.undo()}>
                            <RotateCcw className="size-4" strokeWidth={3} />
                        </button>
                        <button type="button" aria-label="Redo" className={cn(bs.btnOutlinePrimary, toolButton)} onClick={() => map.current?.redo()}>
                            <Repeat className="size-4" strokeWidth={3} />
                        </button>
                    </ToolbarGroup>
                    <ToolbarGroup label="Shift Origin:">
                        {SHIFT_BUTTONS.map((entry) => (
                            <button
                                key={entry.direction}
                                type="button"
                                aria-label={`Shift ${entry.direction}`}
                                className={cn(bs.btnOutlinePrimary, toolButton, entry.width)}
                                onClick={() => map.current?.shift(entry.direction)}
                            >
                                <entry.icon className="size-4" strokeWidth={3} />
                            </button>
                        ))}
                    </ToolbarGroup>
                    {zoomGroup}
                </div>
            )}

            {assigning ? (
                <div id="canvasWrapper" className="w-full overflow-x-auto">
                    <div className="mx-auto w-fit">
                        <canvas id="pitMapCanvas" ref={canvasElement} className="inline align-baseline" />
                    </div>
                </div>
            ) : (
                <canvas id="pitMapCanvas" ref={canvasElement} className="inline align-baseline" />
            )}

            <div className="viewBtns flex flex-wrap justify-end [&>button]:m-[5px]">
                <span className="mr-auto">Cell unit is ¼ pit</span>
                {assigning && (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <button type="button" id="assignDropdownBtn" className={bs.btnSecondary}>
                                Auto-assign Pits
                                <span className="ml-[0.255em] inline-block border-x-[0.3em] border-t-[0.3em] border-x-transparent align-[0.255em]" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-lg border-black/20 bg-white p-0 py-2 text-base text-[#212529]">
                            {AUTO_ASSIGN.map((entry) => (
                                <DropdownMenuItem
                                    key={entry.order}
                                    className="cursor-pointer rounded-none px-4 py-1 text-base whitespace-pre focus:bg-[#f8f9fa]"
                                    onSelect={() => autoAssign(entry.order)}
                                >
                                    {entry.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
                <button type="button" className={bs.btnSecondary} onClick={download}>
                    Export
                </button>
                <button type="button" className={cn(bs.btnSecondary, bs.btnSm, 'ml-[9px]')} onClick={() => setImporting(true)}>
                    Import
                </button>
                <div className="m-[5px] w-px self-stretch border border-[#dee2e6]" />
                <button type="button" className={bs.btnDanger} onClick={clear}>
                    Clear
                </button>
                <button type="button" className={bs.btnWarning} onClick={reset}>
                    Reset
                </button>
                {!assigning && (
                    <>
                        <button type="button" className={bs.btnSecondary} onClick={() => setPreview(false)}>
                            Edit
                        </button>
                        <button type="button" className={bs.btnOutlineSecondary} onClick={() => setPreview(true)}>
                            Preview
                        </button>
                    </>
                )}
                <button type="button" className={bs.btnPrimary} onClick={save}>
                    Save
                </button>
            </div>

            {assigning ? (
                <>
                    <div className={bs.alertInfo}>
                        Pit Addressing is optional. Pit Number &amp; Address can be hidden from teams using the checkboxes below.
                    </div>
                    <div className="settings flex">
                        <div className="pr-[3em]">
                            <label htmlFor="showPitNumber">Show Number:</label>
                            <input
                                type="checkbox"
                                id="showPitNumber"
                                checked={settings.numbers}
                                onChange={(event) => configure({ numbers: event.target.checked })}
                            />
                        </div>
                        <div className="pr-[3em]">
                            <label htmlFor="showPitAddress">Show Address:</label>
                            <input
                                type="checkbox"
                                id="showPitAddress"
                                checked={settings.addresses}
                                onChange={(event) => configure({ addresses: event.target.checked })}
                            />
                        </div>
                        <div className="pr-[3em]">
                            <label htmlFor="publish">Published:</label>
                            <input
                                type="checkbox"
                                id="publish"
                                checked={settings.published}
                                onChange={(event) => configure({ published: event.target.checked })}
                            />
                        </div>
                    </div>
                    <div className="text-center">
                        <Link href={`${base}/pit-map`} className={bs.link}>
                            Printable Pit Map Report
                        </Link>{' '}
                        (must publish first)
                    </div>
                    <hr className="my-4 border-[#dee2e6]" />
                    <PitTeamTable rows={mergeTeamsAndPits(teams, live)} columns={['number', 'name', 'pit', 'address']} showCount />
                </>
            ) : (
                <>
                    <div className={bs.alertInfo}>
                        Pit numbers/addresses can be edited during pit assignments. Maps do not need to be made to-scale.
                    </div>
                    <div className="text-center">
                        <Link href={`${base}/admin/pit-map/assign`} className={bs.btnInfo}>
                            Pit Assignment &amp; Addressing
                        </Link>
                    </div>
                </>
            )}

            {prompt && <PromptDialog key={prompt.title + prompt.defaultValue} request={prompt} onClose={() => setPrompt(null)} />}
            {notice && <NoticeDialog request={notice} onClose={() => setNotice(null)} />}
            {importing && <ImportDialog onUpload={upload} onClose={() => setImporting(false)} />}
        </div>
    );
}
