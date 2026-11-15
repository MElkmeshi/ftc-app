export const Cursor = {
    POINTER: 0,
    SINGLE: 1,
    FILL: 2,
    GRAB: 3,
    TEXT: 4,
    TEXT_ROT: 5,
    DELETE: 6,
    ASSIGN: 7,
    CLEAR: 8,
    INSPECT: 9,
} as const;
export type Cursor = (typeof Cursor)[keyof typeof Cursor];

export const CellType = {
    OPEN: 0,
    BOUNDARY: 1,
    PIT: 2,
    FIELD: 3,
    FIELD_ROT: 4,
    OBJECT: 5,
    LABEL: 6,
} as const;
export type CellType = (typeof CellType)[keyof typeof CellType];

export const PitLabelMode = {
    NUMBER: 1,
    ADDRESS: 2,
    TEAM: 3,
    COLOR: 4,
} as const;
export type PitLabelMode = (typeof PitLabelMode)[keyof typeof PitLabelMode];

export type AutoAssignOrder = 'ascending' | 'descending' | 'random';
export type ShiftDirection = 'up' | 'down' | 'left' | 'right';
export type ZoomAction = 'in' | 'out' | { set: number };

export interface PitObject {
    type: CellType;
    x: number;
    y: number;
    w: number;
    h: number;
    label?: string | null;
    labelRotated?: boolean;
    team?: number;
    address?: string;
    color?: string;
}

export interface PitMapConfig {
    numbers: boolean;
    addresses: boolean;
    published: boolean;
}

export interface PitTeam {
    id?: number;
    number: number;
    name: string;
}

export interface PitTeamRow {
    number: number;
    name: string;
    notPresent: boolean;
    pit: string;
    address: string;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

export type AssignError = { kind: 'illegal-number'; number: string; max: number } | { kind: 'several-pits' };

interface Point {
    x: number;
    y: number;
}

interface CellProps {
    width: number;
    height: number;
    color: string;
    hoverColor: string;
    printColor?: string;
    labelAllowed: boolean;
}

type UndoStep =
    | { op: 'ADD' | 'REMOVE'; entries: { object: PitObject; index: number }[] }
    | { op: 'MOVE'; objects: PitObject[]; dx: number; dy: number }
    | { op: 'SHIFT'; dx: number; dy: number }
    | { op: 'SET_LABEL'; object: PitObject; before: Pick<PitObject, 'label' | 'labelRotated'>; after: Pick<PitObject, 'label' | 'labelRotated'> };

export const BASE_CELL_SIZE = 20;
export const DEFAULT_PIT_COLOR = '#ffa500';
export const MIN_ZOOM = 0.25;

const GRID_EXTENT = 2000;
const HIGHLIGHT = 'cyan';
const SELECTION_STROKE = '#0078D7';
const SELECTION_FILL = 'rgba(170, 204, 238, .5)';
const TEAM_LABEL_SAMPLE = '88888';

export const CELL_PROPS: Record<CellType, CellProps> = {
    [CellType.OPEN]: { width: 1, height: 1, color: 'white', hoverColor: 'rgba(225,225,225,.5)', labelAllowed: false },
    [CellType.BOUNDARY]: { width: 1, height: 1, color: 'black', hoverColor: 'rgba(0,0,0,.5)', labelAllowed: false },
    [CellType.PIT]: { width: 2, height: 2, color: 'orange', printColor: 'white', hoverColor: 'rgba(255, 165, 0, .5)', labelAllowed: false },
    [CellType.FIELD]: { width: 5, height: 3, color: 'white', hoverColor: 'rgba(0, 255, 255, .5)', labelAllowed: true },
    [CellType.FIELD_ROT]: { width: 3, height: 5, color: 'white', hoverColor: 'rgba(0, 255, 255, .5)', labelAllowed: true },
    [CellType.OBJECT]: { width: 1, height: 1, color: 'white', hoverColor: 'rgba(255,255,255,.5)', labelAllowed: true },
    [CellType.LABEL]: { width: 1, height: 1, color: 'white', hoverColor: 'rgba(200,200,200,.5)', labelAllowed: true },
};

const SHIFTS: Record<ShiftDirection, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    right: { dx: 1, dy: 0 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
};

export function cloneObjects(objects: PitObject[]): PitObject[] {
    return objects.map((object) => ({ ...object }));
}

export function pitsOf(objects: PitObject[]): PitObject[] {
    return objects.filter((object) => object.type === CellType.PIT);
}

export function intersects(area: Rect, object: Rect): boolean {
    return !(area.x + area.w < object.x || area.x >= object.x + object.w || area.y + area.h < object.y || area.y >= object.y + object.h);
}

export function normaliseRect(rect: Rect): Rect {
    const normal = { ...rect };

    if (normal.w < 0) {
        normal.x += normal.w;
        normal.w *= -1;
    }

    if (normal.h < 0) {
        normal.y += normal.h;
        normal.h *= -1;
    }

    return normal;
}

export function boundingBox(objects: PitObject[]): Rect {
    if (objects.length === 0) {
        return { x: 0, y: 0, w: 0, h: 0 };
    }

    const left = Math.min(...objects.map((object) => object.x));
    const top = Math.min(...objects.map((object) => object.y));
    const right = Math.max(...objects.map((object) => object.x + object.w));
    const bottom = Math.max(...objects.map((object) => object.y + object.h));

    return { x: left, y: top, w: right - left, h: bottom - top };
}

export function renumberPits(objects: PitObject[]): void {
    pitsOf(objects).forEach((pit, index) => {
        pit.label = String(index + 1);
    });
}

export function nextZoom(zoom: number, action: ZoomAction): number {
    if (typeof action === 'object') {
        return action.set;
    }

    if (action === 'in') {
        return zoom < 1 ? zoom + 0.1 : zoom + 0.25;
    }

    return zoom <= 1 ? Math.max(zoom - 0.1, MIN_ZOOM) : zoom - 0.25;
}

export function fitZoom(availableWidth: number, widthInCells: number, startAt = 1): number {
    let zoom = startAt;

    while (availableWidth < widthInCells * BASE_CELL_SIZE * zoom && zoom > MIN_ZOOM) {
        zoom -= 0.1;
    }

    return Math.max(MIN_ZOOM, zoom);
}

export function swapPitNumber(objects: PitObject[], pit: PitObject, wanted: string): AssignError | null {
    const number = wanted.trim();

    if (pit.label === number) {
        return null;
    }

    const pits = pitsOf(objects);
    const holders = pits.filter((other) => other.label === number && other !== pit);

    if (holders.length === 0) {
        return { kind: 'illegal-number', number: wanted, max: pits.length };
    }

    if (holders.length > 1) {
        return { kind: 'several-pits' };
    }

    const holder = holders[0];
    const { label: holderLabel, ...holderPlace } = holder;
    const { label: pitLabel, ...pitPlace } = pit;

    for (const key of ['team', 'address', 'color'] as const) {
        delete holder[key];
        delete pit[key];
    }

    Object.assign(holder, pitPlace, { label: holderLabel });
    Object.assign(pit, holderPlace, { label: pitLabel });

    return null;
}

export function setPitAddress(pits: PitObject[], address: string | null): void {
    for (const pit of pits) {
        if (address) {
            pit.address = address;
        } else {
            delete pit.address;
        }
    }
}

export function setPitColor(pits: PitObject[], color: string | null): void {
    for (const pit of pits) {
        if (color) {
            pit.color = color;
        } else {
            delete pit.color;
        }
    }
}

export function setPitTeam(pit: PitObject, team: string | null): void {
    const number = parseInt(team ?? '', 10);

    if (number > 0) {
        pit.team = number;
    } else {
        delete pit.team;
    }
}

export function nextQuickAddress(objects: PitObject[], prefix: string, increment: number): string {
    const used = pitsOf(objects)
        .map((pit) => pit.address)
        .filter((address): address is string => address !== undefined && address.startsWith(prefix));

    if (used.length === 0) {
        return `${prefix}${increment}`;
    }

    const highest = used
        .map((address) => ({ value: parseInt(address.substring(prefix.length), 10), zeroPadded: address.charAt(prefix.length) === '0' }))
        .reduce((best, candidate) => (candidate.value > best.value ? candidate : best));
    const next = highest.value + increment;

    if (!next) {
        return `${prefix}${increment}`;
    }

    return `${prefix}${next < 10 && highest.zeroPadded ? `0${next}` : next}`;
}

export function autoAssignTeams(objects: PitObject[], teamNumbers: number[], order: AutoAssignOrder, random: () => number = Math.random): void {
    const pits = pitsOf(objects).sort((a, b) => parseInt(a.label ?? '0', 10) - parseInt(b.label ?? '0', 10));
    let waiting = teamNumbers.filter((number) => !pits.some((pit) => pit.team === number)).sort((a, b) => a - b);

    if (order === 'descending') {
        waiting.reverse();
    } else if (order === 'random') {
        waiting = waiting
            .map((number) => ({ number, key: random() }))
            .sort((a, b) => a.key - b.key)
            .map((entry) => entry.number);
    }

    for (const pit of pits) {
        if (pit.team) {
            continue;
        }

        const team = waiting.shift();

        if (team === undefined) {
            break;
        }

        pit.team = team;
    }
}

export function clearTeams(objects: PitObject[]): void {
    for (const pit of pitsOf(objects)) {
        delete pit.team;
    }
}

export function usedPitColors(objects: PitObject[]): string[] {
    return [...new Set(pitsOf(objects).map((pit) => pit.color ?? DEFAULT_PIT_COLOR))];
}

export function mergeTeamsAndPits(teams: PitTeam[], objects: PitObject[]): PitTeamRow[] {
    const rows = new Map<number, PitTeamRow>(
        teams.map((team) => [team.number, { number: team.number, name: team.name, notPresent: false, pit: '', address: '' }]),
    );

    for (const pit of pitsOf(objects)) {
        if (!pit.team) {
            continue;
        }

        const row = rows.get(pit.team) ?? { number: pit.team, name: 'Not at Event', notPresent: true, pit: '', address: '' };
        row.pit = pit.label ?? '';
        row.address = pit.address ?? '';
        rows.set(pit.team, row);
    }

    return [...rows.values()];
}

export function exportPayload(objects: PitObject[]) {
    const box = boundingBox(objects);

    return { objects: cloneObjects(objects), minX: box.x, minY: box.y, width: box.w, height: box.h, numbers: true, addresses: true };
}

export function parseImport(text: string): PitObject[] | null {
    try {
        const parsed = JSON.parse(text);
        const objects = typeof parsed?.objects === 'string' ? JSON.parse(parsed.objects) : parsed?.objects;

        return Array.isArray(objects) ? objects : null;
    } catch {
        return null;
    }
}

export interface PitMapCanvasOptions {
    canvas: HTMLCanvasElement;
    fitToContent?: boolean;
    onLabelRequest?: (object: PitObject, rotated: boolean, apply: (label: string | null) => void) => void;
    onPitClick?: (pit: PitObject) => void;
    onPitsChosen?: (pits: PitObject[], mode: PitLabelMode, cursor: Cursor) => void;
}

export class PitMapCanvas {
    private readonly canvas: HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;
    private readonly fitToContent: boolean;
    private readonly options: PitMapCanvasOptions;

    private objects: PitObject[] = [];
    private cursor: Cursor = Cursor.POINTER;
    private cellType: CellType = CellType.OPEN;
    private labelMode: PitLabelMode = PitLabelMode.NUMBER;
    private editing = false;
    private assigning = false;
    private printing = false;
    private printPitColors = false;
    private zoom = 1;
    private cell = BASE_CELL_SIZE;
    private highlighted: PitObject | null = null;

    private hover: Point | null = null;
    private dragging = false;
    private dragStart: Point | null = null;
    private dragCurrent: Point | null = null;
    private selectStart: Point | null = null;
    private selectEnd: Point | null = null;
    private grabbed: PitObject | null = null;
    private grabOffset: Point = { x: 0, y: 0 };
    private grabCurrent: Point = { x: 0, y: 0 };
    private selected: PitObject[] = [];
    private pointerStart: Point | null = null;
    private pointerCurrent: Point | null = null;

    private undoStack: UndoStep[] = [];
    private redoStack: UndoStep[] = [];

    constructor(options: PitMapCanvasOptions) {
        const context = options.canvas.getContext('2d');

        if (!context) {
            throw new Error('Could not build 2d context');
        }

        this.options = options;
        this.canvas = options.canvas;
        this.context = context;
        this.fitToContent = options.fitToContent ?? false;
        this.canvas.addEventListener('click', this.onClick);
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseleave', this.onMouseLeave);
        this.draw();
    }

    destroy(): void {
        this.canvas.removeEventListener('click', this.onClick);
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
    }

    setData(objects: PitObject[]): void {
        this.objects = cloneObjects(objects);

        if (this.fitToContent) {
            const box = boundingBox(this.objects);

            for (const object of this.objects) {
                object.x -= box.x;
                object.y -= box.y;
            }
        }

        this.selected = [];
        this.highlighted = null;
        this.draw();
    }

    getObjects(): PitObject[] {
        return cloneObjects(this.objects);
    }

    liveObjects(): PitObject[] {
        return this.objects;
    }

    getBoundingBox(): Rect {
        return boundingBox(this.objects);
    }

    getZoom(): number {
        return this.zoom;
    }

    setCursor(cursor: Cursor): void {
        this.cursor = cursor;
        this.hover = null;
        this.selectStart = null;

        if (cursor === Cursor.SINGLE || cursor === Cursor.FILL || cursor === Cursor.TEXT || cursor === Cursor.TEXT_ROT || cursor === Cursor.DELETE) {
            this.selected = [];
        }

        this.draw();
    }

    setCellType(type: CellType): void {
        this.cellType = type;

        if (this.cursor !== Cursor.FILL || !this.selectStart || !this.selectEnd) {
            return;
        }

        const area = this.pixelsToCells(this.snap(this.selectionRect(this.selectStart, this.selectEnd)));

        if (type === CellType.PIT) {
            const added: PitObject[] = [];
            let number = pitsOf(this.objects).length + 1;

            for (let y = area.y; y < area.y + area.h - 1; y += 2) {
                for (let x = area.x; x < area.x + area.w - 1; x += 2) {
                    added.push({ type, x, y, w: 2, h: 2, label: String(number++) });
                }
            }

            this.add(added);
        } else if (type !== CellType.FIELD && type !== CellType.FIELD_ROT) {
            this.add([{ type, ...area }]);
        }

        this.selectStart = null;
        this.selectEnd = null;
        this.draw();
    }

    setEditing(editing: boolean): void {
        this.editing = editing;
        this.draw();
    }

    setAssigning(assigning: boolean): void {
        this.assigning = assigning;
        this.draw();
    }

    setZoom(zoom: number): void {
        this.zoom = zoom;
        this.cell = BASE_CELL_SIZE * zoom;
        this.draw();
    }

    setPitLabelMode(mode: PitLabelMode): void {
        this.labelMode = mode;
        this.draw();
    }

    setPrintPitColors(print: boolean): void {
        this.printPitColors = print;
        this.draw();
    }

    setPrinting(printing: boolean): void {
        this.printing = printing;
        this.draw();
    }

    highlightTeam(team: number): boolean {
        const pit = pitsOf(this.objects).find((candidate) => candidate.team === team) ?? null;

        if (pit) {
            this.highlighted = pit;
            this.draw();
        }

        return pit !== null;
    }

    shift(direction: ShiftDirection): void {
        const step = SHIFTS[direction];

        this.pushUndo({ op: 'SHIFT', ...step });
        this.moveBy(this.objects, step.dx, step.dy);
        this.draw();
    }

    undo(): void {
        this.replay(this.undoStack, this.redoStack, true);
    }

    redo(): void {
        this.replay(this.redoStack, this.undoStack, false);
    }

    draw(): void {
        const g = this.context;
        const ratio = window.devicePixelRatio || 1;
        const size = this.canvasSize();

        this.applyCursorStyle();
        this.canvas.height = size.h * ratio;
        this.canvas.style.height = `${size.h}px`;
        this.canvas.width = size.w * ratio;
        this.canvas.style.width = `${size.w}px`;
        g.setTransform(ratio, 0, 0, ratio, 0, 0);
        g.clearRect(0, 0, size.w, size.h);
        g.lineWidth = this.zoom;
        g.fillStyle = 'black';
        g.strokeStyle = 'black';

        if (this.editing) {
            for (let x = 0; x < GRID_EXTENT * this.zoom && x < size.w; x += this.cell) {
                for (let y = 0; y < GRID_EXTENT * this.zoom && y < size.h; y += this.cell) {
                    g.strokeRect(x, y, this.cell, this.cell);
                }
            }
        }

        for (const object of this.objects) {
            const moving = this.editing && (object === this.grabbed || (this.selected.includes(object) && this.pointerCurrent !== null));
            const chosen = this.selected.includes(object) && this.pointerCurrent === null;

            this.drawObject(object, moving, chosen);
        }

        if (this.editing) {
            this.drawEditingOverlays();
        } else if (this.assigning && this.dragging && this.dragStart && this.dragCurrent) {
            this.drawRubberBand(this.dragStart, this.dragCurrent);
        }
    }

    private canvasSize(): { w: number; h: number } {
        if (this.fitToContent) {
            const box = this.getBoundingBox();

            return { w: this.cell * box.w, h: this.cell * box.h };
        }

        const parentWidth = this.canvas.parentElement?.clientWidth ?? 0;

        return {
            w: this.cell * Math.floor(parentWidth / this.cell),
            h: this.cell * Math.floor((window.innerHeight * 0.75) / this.cell),
        };
    }

    private applyCursorStyle(): void {
        const styles: Partial<Record<Cursor, string>> = {
            [Cursor.FILL]: 'cell',
            [Cursor.GRAB]: this.grabbed ? 'grabbing' : 'grab',
            [Cursor.TEXT]: 'text',
            [Cursor.TEXT_ROT]: 'text',
            [Cursor.INSPECT]: 'help',
        };

        this.canvas.style.cursor = styles[this.cursor] ?? 'default';
    }

    private drawEditingOverlays(): void {
        const g = this.context;

        if (this.selectStart && this.selectEnd) {
            this.fillCells(this.snap(this.selectionRect(this.selectStart, this.selectEnd)), 'yellow');
        }

        if (this.dragging && this.dragStart && this.dragCurrent) {
            this.fillCells(this.snap(this.selectionRect(this.dragStart, this.dragCurrent)), 'yellow');
        }

        if (this.grabbed) {
            const place = this.cellAt({ x: this.grabCurrent.x - this.grabOffset.x, y: this.grabCurrent.y - this.grabOffset.y });

            this.drawObject({ ...this.grabbed, ...place }, false, false);
        }

        if (this.selected.length > 0 && this.pointerCurrent && this.pointerStart) {
            for (const object of this.selected) {
                const place = this.cellAt({
                    x: this.cell * object.x + (this.pointerCurrent.x - this.pointerStart.x),
                    y: this.cell * object.y + (this.pointerCurrent.y - this.pointerStart.y),
                });

                this.drawObject({ ...object, ...place }, false, true);
            }
        }

        if (this.hover && this.cursor === Cursor.SINGLE) {
            this.drawObject(this.newObject(this.cellAt(this.hover), false), true, false);
        }

        if (this.hover && this.cursor === Cursor.DELETE) {
            const target = this.topmostAt(this.cellAt(this.hover));

            if (target) {
                g.strokeStyle = 'red';
                g.strokeRect(target.x * this.cell, target.y * this.cell, this.cell * target.w, this.cell * target.h);
                g.strokeRect(target.x * this.cell + 1, target.y * this.cell + 1, this.cell * target.w - 2, this.cell * target.h - 2);
            }
        }

        if (this.pointerCurrent && this.pointerStart && this.selected.length === 0) {
            this.drawRubberBand(this.pointerStart, this.pointerCurrent);
        }
    }

    private drawRubberBand(from: Point, to: Point): void {
        const g = this.context;

        g.strokeStyle = SELECTION_STROKE;
        g.fillStyle = SELECTION_FILL;
        g.fillRect(from.x, from.y, to.x - from.x, to.y - from.y);
        g.strokeRect(from.x, from.y, to.x - from.x, to.y - from.y);
    }

    private pitFill(object: PitObject, hovering: boolean): string {
        const props = CELL_PROPS[object.type];
        const colorsShown = !this.printing || this.printPitColors;

        if (object === this.highlighted) {
            return HIGHLIGHT;
        }

        if (object.type === CellType.PIT && object.color && colorsShown) {
            return object.color;
        }

        if (this.printing) {
            return !this.printPitColors && props.printColor ? props.printColor : props.color;
        }

        return hovering ? props.hoverColor : props.color;
    }

    private pitText(object: PitObject): string {
        if (object.type !== CellType.PIT) {
            return object.label ?? '';
        }

        if (this.labelMode === PitLabelMode.ADDRESS) {
            return object.address ?? '';
        }

        if (this.labelMode === PitLabelMode.TEAM) {
            return object.team ? String(object.team) : '';
        }

        return object.label ?? '';
    }

    private drawObject(object: PitObject, hovering: boolean, chosen: boolean): void {
        const g = this.context;
        const cell = this.cell;
        const left = object.x * cell;
        const top = object.y * cell;
        const width = object.w * cell;
        const height = object.h * cell;
        const outlined = object.type !== CellType.LABEL;

        if (outlined) {
            g.strokeRect(left, top, width, height);
        }

        g.fillStyle = this.pitFill(object, hovering);
        g.fillRect(left + this.zoom / 2, top + this.zoom / 2, width - this.zoom, height - this.zoom);

        const gap = Math.round((1.5 * cell * 2) / 10);
        const long = Math.round((12 * cell * 2) / 10);
        const short = Math.round((3.5 * cell * 2) / 10);

        g.fillStyle = 'black';

        if (object.type === CellType.FIELD) {
            g.strokeRect(left + gap, top + gap, short, long);
            g.strokeRect(left + gap + short + gap, top + gap, long, long);
            g.strokeRect(left + gap + short + gap + long + gap, top + gap, short, long);
        } else if (object.type === CellType.FIELD_ROT) {
            g.strokeRect(left + gap, top + gap, long, short);
            g.strokeRect(left + gap, top + gap + short + gap, long, long);
            g.strokeRect(left + gap, top + gap + short + gap + long + gap, long, short);
        }

        const text = this.pitText(object);

        if (text && (object.type === CellType.PIT || CELL_PROPS[object.type].labelAllowed)) {
            const measured = object.type === CellType.PIT && this.labelMode === PitLabelMode.TEAM ? TEAM_LABEL_SAMPLE : text;
            const room = (object.labelRotated ? object.h : object.w) * cell - 2;
            let fontSize = Math.round(0.6 * Math.min(object.h, object.w) * cell);

            g.font = `${fontSize}px sans-serif`;

            while (g.measureText(measured).width >= room && fontSize > 0) {
                fontSize -= 2;
                g.font = `${fontSize}px sans-serif`;
            }

            g.textAlign = 'center';
            g.textBaseline = 'middle';
            g.save();
            g.translate(Math.round(left + width / 2), Math.round(top + height / 2));

            if (object.labelRotated) {
                g.rotate(-Math.PI / 2);
            }

            g.fillText(text, 0, 0);
            g.restore();
        }

        if (outlined) {
            const stroke = g.strokeStyle;

            if (chosen && !hovering) {
                g.strokeStyle = HIGHLIGHT;
                g.strokeRect(left - 1, top - 1, width + 2, height + 2);
            }

            g.strokeRect(left, top, width, height);
            g.strokeStyle = stroke;
        }
    }

    private fillCells(area: Rect, color: string): void {
        const g = this.context;

        g.fillStyle = color;

        for (let x = area.x; x < area.x + area.w; x += this.cell) {
            for (let y = area.y; y < area.y + area.h; y += this.cell) {
                g.fillRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
            }
        }
    }

    private cellAt(point: Point): Point {
        return { x: Math.floor(point.x / this.cell), y: Math.floor(point.y / this.cell) };
    }

    private selectionRect(from: Point, to: Point): Rect {
        return { x: from.x, y: from.y, w: to.x - from.x, h: to.y - from.y };
    }

    private snap(pixels: Rect): Rect {
        const rect = normaliseRect(pixels);
        const right = this.cell * Math.ceil((rect.x + rect.w) / this.cell);
        const bottom = this.cell * Math.ceil((rect.y + rect.h) / this.cell);
        const left = this.cell * Math.floor(rect.x / this.cell);
        const top = this.cell * Math.floor(rect.y / this.cell);

        return { x: left, y: top, w: right - left, h: bottom - top };
    }

    private pixelsToCells(pixels: Rect): Rect {
        return {
            x: Math.round(pixels.x / this.cell),
            y: Math.round(pixels.y / this.cell),
            w: Math.round(pixels.w / this.cell),
            h: Math.round(pixels.h / this.cell),
        };
    }

    private cellsBetween(from: Point, to: Point): Rect {
        const start = this.cellAt(from);
        const end = this.cellAt(to);

        return normaliseRect({ x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y });
    }

    private objectsIn(area: Rect): PitObject[] {
        return this.objects.filter((object) => intersects(area, object));
    }

    private topmostAt(cell: Point): PitObject | null {
        const found = this.objectsIn({ ...cell, w: 0, h: 0 });

        return found[found.length - 1] ?? null;
    }

    private newObject(cell: Point, numbered: boolean): PitObject {
        const props = CELL_PROPS[this.cellType];

        return {
            type: this.cellType,
            x: cell.x,
            y: cell.y,
            w: props.width,
            h: props.height,
            label: numbered && this.cellType === CellType.PIT ? String(pitsOf(this.objects).length + 1) : null,
        };
    }

    private add(objects: PitObject[]): void {
        if (objects.length === 0) {
            return;
        }

        const entries = objects.map((object, offset) => ({ object, index: this.objects.length + offset }));

        this.objects.push(...objects);
        this.pushUndo({ op: 'ADD', entries });
    }

    private moveBy(objects: PitObject[], dx: number, dy: number): void {
        for (const object of objects) {
            object.x += dx;
            object.y += dy;
        }
    }

    private pushUndo(step: UndoStep): void {
        this.undoStack.push(step);
        this.redoStack = [];
    }

    private replay(from: UndoStep[], to: UndoStep[], backwards: boolean): void {
        const step = from.pop();

        if (!step) {
            return;
        }

        const direction = backwards ? -1 : 1;

        if (step.op === 'ADD' || step.op === 'REMOVE') {
            const removing = (step.op === 'ADD') === backwards;

            if (removing) {
                this.objects = this.objects.filter((object) => !step.entries.some((entry) => entry.object === object));
            } else {
                for (const entry of [...step.entries].sort((a, b) => a.index - b.index)) {
                    this.objects.splice(Math.min(entry.index, this.objects.length), 0, entry.object);
                }
            }

            if (step.entries.some((entry) => entry.object.type === CellType.PIT)) {
                renumberPits(this.objects);
            }
        } else if (step.op === 'MOVE') {
            this.moveBy(step.objects, step.dx * direction, step.dy * direction);
        } else if (step.op === 'SHIFT') {
            this.moveBy(this.objects, step.dx * direction, step.dy * direction);
        } else if (step.op === 'SET_LABEL') {
            Object.assign(step.object, backwards ? step.before : step.after);
        }

        this.selected = [];
        to.push(step);
        this.draw();
    }

    private readonly onClick = (event: MouseEvent): void => {
        const cell = this.cellAt({ x: event.offsetX, y: event.offsetY });

        if (!this.editing) {
            if (!this.assigning || this.cursor === Cursor.INSPECT) {
                const pit = this.objectsIn({ ...cell, w: 0, h: 0 }).find((object) => object.type === CellType.PIT);

                if (pit) {
                    this.options.onPitClick?.(pit);
                }
            }

            return;
        }

        if (this.cursor === Cursor.SINGLE) {
            const object = this.newObject(cell, true);

            if (this.cellType === CellType.OPEN && this.objectsIn(object).length === 0) {
                return;
            }

            this.add([object]);
            this.draw();
        } else if (this.cursor === Cursor.DELETE) {
            const target = this.topmostAt(cell);

            if (!target) {
                return;
            }

            const index = this.objects.indexOf(target);

            this.objects.splice(index, 1);
            this.pushUndo({ op: 'REMOVE', entries: [{ object: target, index }] });

            if (target.type === CellType.PIT) {
                renumberPits(this.objects);
            }

            this.draw();
        } else if (this.cursor === Cursor.TEXT || this.cursor === Cursor.TEXT_ROT) {
            const target = this.objectsIn({ ...cell, w: 0, h: 0 }).find((object) => CELL_PROPS[object.type].labelAllowed);
            const rotated = this.cursor === Cursor.TEXT_ROT;

            if (!target) {
                return;
            }

            this.options.onLabelRequest?.(target, rotated, (label) => {
                const after = { label, labelRotated: rotated };

                this.pushUndo({
                    op: 'SET_LABEL',
                    object: target,
                    before: { label: target.label ?? null, labelRotated: target.labelRotated ?? false },
                    after,
                });
                Object.assign(target, after);
                this.draw();
            });
        }
    };

    private readonly onMouseDown = (event: MouseEvent): void => {
        if (!this.editing && !this.assigning) {
            return;
        }

        const point = { x: event.offsetX, y: event.offsetY };
        const cell = this.cellAt(point);
        const manyAllowed = this.labelMode === PitLabelMode.ADDRESS || this.labelMode === PitLabelMode.COLOR;

        if (this.cursor === Cursor.FILL || this.cursor === Cursor.ASSIGN || this.cursor === Cursor.CLEAR) {
            this.dragging = this.cursor !== Cursor.ASSIGN || manyAllowed;
            this.dragStart = point;
            this.dragCurrent = point;
            this.selectStart = null;
            this.selectEnd = null;
        } else if (this.cursor === Cursor.GRAB) {
            const target = this.topmostAt(cell);

            if (target) {
                this.grabbed = target;
                this.grabOffset = { x: point.x - target.x * this.cell, y: point.y - target.y * this.cell };
                this.grabCurrent = point;
                this.draw();
            }
        } else if (this.cursor === Cursor.POINTER) {
            this.pointerStart = point;

            if (this.selected.some((object) => intersects({ ...cell, w: 0, h: 0 }, object))) {
                this.pointerCurrent = point;
            } else {
                this.selected = [];
            }
        }
    };

    private readonly onMouseUp = (event: MouseEvent): void => {
        if (!this.editing && !this.assigning) {
            return;
        }

        const point = { x: event.offsetX, y: event.offsetY };

        if (this.dragging) {
            this.selectStart = this.dragStart;
            this.selectEnd = this.dragCurrent;
            this.dragging = false;
            this.draw();
        }

        if (this.grabbed) {
            const place = this.cellAt({ x: point.x - this.grabOffset.x, y: point.y - this.grabOffset.y });
            const dx = place.x - this.grabbed.x;
            const dy = place.y - this.grabbed.y;

            if (dx !== 0 || dy !== 0) {
                this.pushUndo({ op: 'MOVE', objects: [this.grabbed], dx, dy });
                this.moveBy([this.grabbed], dx, dy);
            }

            this.grabbed = null;
            this.draw();
        }

        if (this.editing && this.cursor === Cursor.POINTER) {
            const start = this.pointerStart ?? point;

            if (this.selected.length === 0) {
                this.selected = this.objectsIn(this.cellsBetween(start, point));
            } else if (this.pointerCurrent) {
                const moved = this.cellAt({ x: this.pointerCurrent.x - start.x, y: this.pointerCurrent.y - start.y });

                if (moved.x !== 0 || moved.y !== 0) {
                    this.moveBy(this.selected, moved.x, moved.y);
                    this.pushUndo({ op: 'MOVE', objects: [...this.selected], dx: moved.x, dy: moved.y });
                }
            }

            this.pointerCurrent = null;
            this.pointerStart = null;
            this.draw();
        }

        if (this.assigning && (this.cursor === Cursor.ASSIGN || this.cursor === Cursor.SINGLE || this.cursor === Cursor.CLEAR)) {
            const manyAllowed = this.labelMode === PitLabelMode.ADDRESS || this.labelMode === PitLabelMode.COLOR || this.cursor === Cursor.CLEAR;
            const area =
                manyAllowed && this.cursor !== Cursor.SINGLE && this.selectStart && this.selectEnd
                    ? this.cellsBetween(this.selectStart, this.selectEnd)
                    : { ...this.cellAt(point), w: 0, h: 0 };
            const pits = this.objectsIn(area).filter((object) => object.type === CellType.PIT);

            this.selectStart = null;
            this.selectEnd = null;

            if (pits.length > 0) {
                this.options.onPitsChosen?.(pits, this.labelMode, this.cursor);
            }
        }
    };

    private readonly onMouseMove = (event: MouseEvent): void => {
        const point = { x: event.offsetX, y: event.offsetY };

        if (this.dragging) {
            this.dragCurrent = point;
            this.draw();
        } else if (this.grabbed) {
            this.grabCurrent = point;
            this.draw();
        } else if (this.cursor === Cursor.POINTER && this.pointerStart && this.editing) {
            this.pointerCurrent = point;
            this.draw();
        } else if (this.editing && (this.cursor === Cursor.SINGLE || this.cursor === Cursor.DELETE)) {
            this.hover = point;
            this.draw();
        }
    };

    private readonly onMouseLeave = (): void => {
        this.hover = null;
        this.grabbed = null;
        this.pointerCurrent = null;
        this.pointerStart = null;
        this.dragging = false;
        this.draw();
    };
}
