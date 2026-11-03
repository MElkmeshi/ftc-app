import { apiScope, eventApiUrl, resolveEventHref } from '@/lib/event';
import { describe, expect, it } from 'vitest';

describe('eventApiUrl', () => {
    it('sends API calls on an event page to that event', () => {
        expect(eventApiUrl('/api/score-types', '/event/spring/admin/score-types')).toBe('/api/event/spring/score-types');
    });

    it('sends API calls on a game page to that game', () => {
        expect(eventApiUrl('/api/score-types', '/games/7/scoring')).toBe('/api/games/7/score-types');
        expect(eventApiUrl('/api/ranking-method', '/games/7/settings')).toBe('/api/games/7/ranking-method');
    });

    it('leaves URLs that are already scoped alone', () => {
        expect(eventApiUrl('/api/games/3/groups', '/event/spring/dashboard')).toBe('/api/games/3/groups');
    });
});

describe('apiScope', () => {
    it('keeps cached data of different events and games apart', () => {
        expect(apiScope('/event/spring/admin/score-types')).toBe('event:spring');
        expect(apiScope('/games/7/scoring')).toBe('game:7');
        expect(apiScope('/games')).toBe('server');
    });
});

describe('resolveEventHref', () => {
    it('treats the Games page as a server page', () => {
        expect(resolveEventHref('/games', '/event/spring/dashboard')).toBe('/games');
    });
});
