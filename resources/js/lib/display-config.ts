/**
 * What one physical screen shows. Like FTC Live, every venue screen opens the
 * same /display page and picks its own type; the choice lives in the page
 * address so a bookmark or a reload keeps it.
 */
export type DisplayType = 'audience' | 'field' | 'pit' | 'sponsor';

export interface DisplayConfig {
    type: DisplayType;
    mute: boolean;
    /** Blue on the left: for a field screen watched from the far side. */
    flipped: boolean;
    /** The one field this screen follows at a multi-field event; null follows every field. */
    field: number | null;
    /** A label so the screen can be told apart in match control, e.g. "Pit TV 2". */
    name: string | null;
    /** Audience and field screens can show their bars over a chroma key colour for a livestream. */
    overlay: boolean;
    /** The chroma key colour behind a stream overlay. */
    color: string | null;
}

export interface DisplayTypeOption {
    value: DisplayType;
    label: string;
    description: string;
    playsSound: boolean;
    /** Field screens can swap sides and follow one field. */
    canFlip: boolean;
    canOverlay: boolean;
}

export const DISPLAY_TYPES: DisplayTypeOption[] = [
    {
        value: 'audience',
        label: 'Audience',
        description: 'Projector for the crowd. Shows whatever Match Control puts up: preview, match, results, rankings, bracket.',
        playsSound: true,
        canFlip: false,
        canOverlay: true,
    },
    {
        value: 'field',
        label: 'Field',
        description: 'Screen for the drive teams. Always shows the match on the field with its timer and live score.',
        playsSound: true,
        canFlip: true,
        canOverlay: true,
    },
    {
        value: 'pit',
        label: 'Pit',
        description: 'TV in the pits. Scrolling rankings next to the matches coming up.',
        playsSound: false,
        canFlip: false,
        canOverlay: false,
    },
    {
        value: 'sponsor',
        label: 'Sponsor',
        description: "Cycles through the event's sponsors.",
        playsSound: false,
        canFlip: false,
        canOverlay: false,
    },
];

export const DEFAULT_OVERLAY_COLOR = '#00ff00';

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = {
    type: 'audience',
    mute: false,
    flipped: false,
    field: null,
    name: null,
    overlay: false,
    color: null,
};

export function displayTypeOption(type: DisplayType): DisplayTypeOption {
    return DISPLAY_TYPES.find((option) => option.value === type) ?? DISPLAY_TYPES[0];
}

function isDisplayType(value: string | null): value is DisplayType {
    return DISPLAY_TYPES.some((option) => option.value === value);
}

/** Whether this screen has been set up yet (FTC Live opens its settings until it has). */
export function isDisplayConfigured(search: string): boolean {
    return new URLSearchParams(search).has('type');
}

export function parseDisplayConfig(search: string): DisplayConfig {
    const params = new URLSearchParams(search);
    const type = params.get('type');
    const field = Number(params.get('field'));
    const color = params.get('color');

    const legacyOverlay = type === 'overlay';
    const resolvedType = isDisplayType(type) ? type : DEFAULT_DISPLAY_CONFIG.type;

    return {
        type: resolvedType,
        overlay: displayTypeOption(resolvedType).canOverlay && (legacyOverlay || params.get('overlay') === '1'),
        mute: params.get('mute') === '1',
        flipped: params.get('flipped') === '1',
        field: Number.isInteger(field) && field >= 1 ? field : null,
        name: params.get('name')?.trim().slice(0, 40) || null,
        color: color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null,
    };
}

/** Query string for a config, leaving out options that don't apply to its type. */
export function displayConfigQuery(config: DisplayConfig): string {
    const option = displayTypeOption(config.type);
    const params = new URLSearchParams({ type: config.type });

    if (config.mute && option.playsSound) {
        params.set('mute', '1');
    }

    if (config.flipped && option.canFlip) {
        params.set('flipped', '1');
    }

    if (config.field && option.canFlip) {
        params.set('field', String(config.field));
    }

    if (config.overlay && option.canOverlay) {
        params.set('overlay', '1');

        if (config.color && config.color !== DEFAULT_OVERLAY_COLOR) {
            params.set('color', config.color);
        }
    }

    if (config.name?.trim()) {
        params.set('name', config.name.trim().slice(0, 40));
    }

    return `?${params.toString()}`;
}

/** Whether the screen should try to play match sounds. */
export function displayPlaysSound(config: DisplayConfig): boolean {
    return displayTypeOption(config.type).playsSound && !config.mute;
}
