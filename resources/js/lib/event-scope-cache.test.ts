import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { clearCacheOnScopeChange } from './event-scope-cache';

describe('clearCacheOnScopeChange', () => {
    it("drops the previous event's cached matches when moving to another event", () => {
        const queryClient = new QueryClient();
        const onNavigate = clearCacheOnScopeChange(queryClient, 'event:alpha');
        queryClient.setQueryData(['active-match'], { id: 1 });

        onNavigate('/event/beta/referee/scoring');

        expect(queryClient.getQueryData(['active-match'])).toBeUndefined();
    });

    it('keeps the cache while moving between pages of the same event', () => {
        const queryClient = new QueryClient();
        const onNavigate = clearCacheOnScopeChange(queryClient, 'event:alpha');
        queryClient.setQueryData(['active-match'], { id: 1 });

        onNavigate('/event/alpha/display');

        expect(queryClient.getQueryData(['active-match'])).toEqual({ id: 1 });
    });
});
