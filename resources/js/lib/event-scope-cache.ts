import { apiScope } from '@/lib/event';
import { type QueryClient } from '@tanstack/react-query';

/**
 * Match, active-match and loaded-match queries are cached under plain keys,
 * and the query cache outlives Inertia page visits. Clearing it whenever the
 * page moves to another event (or game) keeps one event's matches from ever
 * showing, or being scored, on another event's screens.
 */
export function clearCacheOnScopeChange(queryClient: QueryClient, initialScope: string = apiScope()): (pathname?: string) => void {
    let scope = initialScope;

    return (pathname = window.location.pathname) => {
        const next = apiScope(pathname);

        if (next !== scope) {
            scope = next;
            queryClient.clear();
        }
    };
}
