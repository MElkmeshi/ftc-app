/**
 * What one physical screen shows. Like FTC Live, every venue screen opens the
 * same /display page and picks its own type; the choice lives in the page
 * address so a bookmark or a reload keeps it.
 */
export type DisplayType = 'audience' | 'field' | 'pit' | 'overlay';

export interface DisplayConfig {
    type: DisplayType;
    mute: boolean;
    /** Blue on the left: for a field screen watched from the far side. */
    flipped: boolean;
    /** The one field this screen follows at a multi-field event; null follows every field. */
    field: number | null;
    /** A label so the screen can be told apart in match control, e.g. "Pit TV 2". */
    name: string | null;
}

export interface DisplayTypeOption {
    value: DisplayType;
    label: string;
    description: string;
    playsSound: boolean;
    /** Field screens can swap sides and follow one field. */
    canFlip: boolean;
}

export const DISPLAY_TYPES: DisplayTypeOption[] = [
    {
        value: 'audience',
        label: 'Audience',
        description: 'Projector for the crowd. Shows whatever Match Control puts up: preview, match, results, rankings, bracket.',
        playsSound: true,
        canFlip: false,
    },
    {
        value: 'field',
        label: 'Field',
        description: 'Screen for the drive teams. Always shows the match on the field with its timer and live score.',
        playsSound: true,
        canFlip: true,
    },
    {
        value: 'pit',
        label: 'Pit',
        description: 'TV in the pits. Scrolling rankings next to the matches coming up.',
        playsSound: false,
        canFlip: false,
    },
    {
        value: 'overlay',
        label: 'Stream overlay',
        description: 'Green-screen scorebar for a livestream (chroma key the green area).',
        playsSound: true,
        canFlip: false,
    },
];

export const DEFAULT_DISPLAY_CONFIG: DisplayConfig = { type: 'audience', mute: false, flipped: false, field: null, name: null };

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

    return {
        type: isDisplayType(type) ? type : DEFAULT_DISPLAY_CONFIG.type,
        mute: params.get('mute') === '1',
        flipped: params.get('flipped') === '1',
        field: Number.isInteger(field) && field >= 1 ? field : null,
        name: params.get('name')?.trim().slice(0, 40) || null,
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

    if (config.name?.trim()) {
        params.set('name', config.name.trim().slice(0, 40));
    }

    return `?${params.toString()}`;
}

/** Whether the screen should try to play match sounds. */
export function displayPlaysSound(config: DisplayConfig): boolean {
    return displayTypeOption(config.type).playsSound && !config.mute;
}
