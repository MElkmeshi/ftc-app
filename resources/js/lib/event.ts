/**
 * Every competition page lives under `/event/{code}/...` and every API call
 * under `/api/event/{code}/...`, like FTC Live. These helpers read the code of
 * the event being viewed from the URL so that links, API calls and broadcast
 * channels all stay inside that event.
 */

const EVENT_PATH = /^\/event\/([a-z0-9_]+)(?:\/|$)/;

/** Game pages (`/games/{id}/scoring`, `/games/{id}/settings`) edit one game outside any event. */
const GAME_PATH = /^\/games\/(\d+)(?:\/|$)/;

export function currentEventCode(pathname: string = window.location.pathname): string | null {
    return EVENT_PATH.exec(pathname)?.[1] ?? null;
}

/** The id of the game a `/games/{id}/...` page is editing. */
export function currentGameId(pathname: string = window.location.pathname): number | null {
    const id = GAME_PATH.exec(pathname)?.[1];

    return id ? Number(id) : null;
}

/**
 * Which event or game the page's API calls go to, for use in query keys so
 * cached score types of one game are never shown on another game's page.
 */
export function apiScope(pathname: string = window.location.pathname): string {
    const code = currentEventCode(pathname);
    const gameId = currentGameId(pathname);

    return code ? `event:${code}` : gameId ? `game:${gameId}` : 'server';
}

function requireEventCode(): string {
    const code = currentEventCode();

    if (!code) {
        throw new Error('This page is not inside an event (expected a /event/{code}/ URL).');
    }

    return code;
}

/** `/referee/scoring` → `/event/{code}/referee/scoring` */
export function eventUrl(path: string, code: string = requireEventCode()): string {
    return `/event/${code}${path === '/' ? '' : path}`;
}

/**
 * `/api/teams` → `/api/event/{code}/teams`. On a game page, game API calls
 * such as `/api/score-types` go to `/api/games/{id}/score-types` instead.
 * URLs that are already scoped, or not API URLs, are returned unchanged.
 */
export function eventApiUrl(url: string, pathname: string = window.location.pathname): string {
    if (!url.startsWith('/api/') || url.startsWith('/api/event/') || url.startsWith('/api/games/')) {
        return url;
    }

    const code = currentEventCode(pathname);
    const gameId = currentGameId(pathname);

    if (!code && gameId !== null) {
        return `/api/games/${gameId}${url.slice(4)}`;
    }

    return `/api/event/${code ?? requireEventCode()}${url.slice(4)}`;
}

/** Public broadcast channel scoped to the current event, e.g. `event.{code}.match-control`. */
export function eventChannel(suffix: string): string {
    return `event.${requireEventCode()}.${suffix}`;
}

const GLOBAL_PATHS = ['/settings', '/event/', '/events', '/games', '/accounts', '/login', '/register', '/logout'];

/**
 * Turns an app-relative link such as `/admin/teams` into the current event's
 * URL. Global pages (settings, auth, the event list) and links outside an
 * event are left alone, so shared navigation can use plain paths.
 */
export function resolveEventHref(href: string, pathname: string = window.location.pathname): string {
    const code = currentEventCode(pathname);

    if (!code || !href.startsWith('/') || GLOBAL_PATHS.some((prefix) => href.startsWith(prefix))) {
        return href;
    }

    return eventUrl(href, code);
}
