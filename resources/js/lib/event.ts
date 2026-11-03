/**
 * Every competition page lives under `/event/{code}/...` and every API call
 * under `/api/event/{code}/...`, like FTC Live. These helpers read the code of
 * the event being viewed from the URL so that links, API calls and broadcast
 * channels all stay inside that event.
 */

const EVENT_PATH = /^\/event\/([a-z0-9_]+)(?:\/|$)/;

export function currentEventCode(pathname: string = window.location.pathname): string | null {
    return EVENT_PATH.exec(pathname)?.[1] ?? null;
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
 * `/api/teams` → `/api/event/{code}/teams`. URLs that are already event-scoped,
 * or not API URLs, are returned unchanged.
 */
export function eventApiUrl(url: string): string {
    if (!url.startsWith('/api/') || url.startsWith('/api/event/')) {
        return url;
    }

    return `/api/event/${requireEventCode()}${url.slice(4)}`;
}

/** Public broadcast channel scoped to the current event, e.g. `event.{code}.match-control`. */
export function eventChannel(suffix: string): string {
    return `event.${requireEventCode()}.${suffix}`;
}

const GLOBAL_PATHS = ['/settings', '/event/', '/events', '/login', '/register', '/logout'];

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
