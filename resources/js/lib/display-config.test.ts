import { describe, expect, it } from 'vitest';
import { type DisplayConfig, displayConfigQuery, displayPlaysSound, isDisplayConfigured, parseDisplayConfig } from './display-config';

const config = (overrides: Partial<DisplayConfig>): DisplayConfig => ({
    type: 'audience',
    mute: false,
    flipped: false,
    field: null,
    name: null,
    color: null,
    ...overrides,
});

describe('display config', () => {
    it('reads the type and options from the address', () => {
        expect(parseDisplayConfig('?type=field&mute=1&flipped=1&field=2')).toEqual({
            type: 'field',
            mute: true,
            flipped: true,
            field: 2,
            name: null,
            color: null,
        });
    });

    it('falls back to the audience display for a missing or unknown type, and to every field for a bad field', () => {
        expect(parseDisplayConfig('')).toEqual(config({}));
        expect(parseDisplayConfig('?type=scoreboard').type).toBe('audience');
        expect(parseDisplayConfig('?type=field&field=0').field).toBeNull();
        expect(parseDisplayConfig('?type=field&field=two').field).toBeNull();
    });

    it('knows whether the screen has been set up', () => {
        expect(isDisplayConfigured('')).toBe(false);
        expect(isDisplayConfigured('?type=pit')).toBe(true);
    });

    it('drops options that do not apply to the chosen type', () => {
        expect(displayConfigQuery(config({ type: 'pit', mute: true, flipped: true, field: 2 }))).toBe('?type=pit');
        expect(displayConfigQuery(config({ type: 'field', mute: true, flipped: true, field: 2 }))).toBe('?type=field&mute=1&flipped=1&field=2');
        expect(displayConfigQuery(config({ type: 'audience', flipped: true, field: 2 }))).toBe('?type=audience');
    });

    it('keeps a short name for the screen', () => {
        expect(parseDisplayConfig('?type=pit&name=Pit%20TV%202').name).toBe('Pit TV 2');
        expect(parseDisplayConfig('?type=pit&name=%20%20').name).toBeNull();
        expect(displayConfigQuery(config({ type: 'pit', name: 'Pit TV' }))).toBe('?type=pit&name=Pit+TV');
    });

    it('only plays sound on unmuted screens that have sounds', () => {
        expect(displayPlaysSound(config({}))).toBe(true);
        expect(displayPlaysSound(config({ mute: true }))).toBe(false);
        expect(displayPlaysSound(config({ type: 'pit' }))).toBe(false);
    });

    it('keeps a chosen chroma key colour only on a stream overlay', () => {
        expect(displayConfigQuery(config({ type: 'overlay', color: '#0000ff' }))).toBe('?type=overlay&color=%230000ff');
        expect(displayConfigQuery(config({ type: 'overlay', color: '#00ff00' }))).toBe('?type=overlay');
        expect(displayConfigQuery(config({ type: 'audience', color: '#0000ff' }))).toBe('?type=audience');
        expect(parseDisplayConfig('?type=overlay&color=%230000FF').color).toBe('#0000ff');
        expect(parseDisplayConfig('?type=overlay&color=red').color).toBeNull();
    });
});
