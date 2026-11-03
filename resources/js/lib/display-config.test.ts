import { describe, expect, it } from 'vitest';
import { displayConfigQuery, displayPlaysSound, isDisplayConfigured, parseDisplayConfig } from './display-config';

describe('display config', () => {
    it('reads the type and options from the address', () => {
        expect(parseDisplayConfig('?type=field&mute=1&flipped=1')).toEqual({ type: 'field', mute: true, flipped: true });
    });

    it('falls back to the audience display for a missing or unknown type', () => {
        expect(parseDisplayConfig('')).toEqual({ type: 'audience', mute: false, flipped: false });
        expect(parseDisplayConfig('?type=scoreboard').type).toBe('audience');
    });

    it('knows whether the screen has been set up', () => {
        expect(isDisplayConfigured('')).toBe(false);
        expect(isDisplayConfigured('?type=pit')).toBe(true);
    });

    it('drops options that do not apply to the chosen type', () => {
        expect(displayConfigQuery({ type: 'pit', mute: true, flipped: true })).toBe('?type=pit');
        expect(displayConfigQuery({ type: 'field', mute: true, flipped: true })).toBe('?type=field&mute=1&flipped=1');
        expect(displayConfigQuery({ type: 'audience', mute: false, flipped: true })).toBe('?type=audience');
    });

    it('only plays sound on unmuted screens that have sounds', () => {
        expect(displayPlaysSound({ type: 'audience', mute: false, flipped: false })).toBe(true);
        expect(displayPlaysSound({ type: 'audience', mute: true, flipped: false })).toBe(false);
        expect(displayPlaysSound({ type: 'pit', mute: false, flipped: false })).toBe(false);
    });
});
