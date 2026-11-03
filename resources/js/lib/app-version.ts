/**
 * Reloads a screen after the server is updated, like FTC Live's APP_VERSION
 * message. Tablets and displays sit on one page for a whole event and never
 * navigate, so without this they would keep running the old code.
 *
 * The page remembers the build version it was loaded with; the server reports
 * the current one. A reload waits while a scoring tap is still being sent.
 */

const CHECK_INTERVAL_MS = 30 * 1000;
const BUSY_RETRY_MS = 2000;

interface VersionWatchOptions {
    loadedVersion: string | null | undefined;
    /** Whether something the user did is still being saved. */
    isBusy: () => boolean;
    reload?: () => void;
    fetchVersion?: () => Promise<string | null>;
}

export async function fetchServerVersion(): Promise<string | null> {
    const response = await fetch('/server-time', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const { version } = (await response.json()) as { version?: string | null };

    return version ?? null;
}

export function createVersionWatch({
    loadedVersion,
    isBusy,
    reload = () => window.location.reload(),
    fetchVersion = fetchServerVersion,
}: VersionWatchOptions) {
    let reloading = false;

    const reloadWhenIdle = () => {
        if (isBusy()) {
            setTimeout(reloadWhenIdle, BUSY_RETRY_MS);

            return;
        }

        reload();
    };

    /** Asks the server for its version and reloads if it changed. Returns true when a reload is on its way. */
    const check = async (): Promise<boolean> => {
        if (reloading || !loadedVersion) {
            return reloading;
        }

        try {
            const serverVersion = await fetchVersion();

            if (serverVersion && serverVersion !== loadedVersion) {
                reloading = true;
                reloadWhenIdle();
            }
        } catch {
            // Offline: the next check or the reconnect will try again.
        }

        return reloading;
    };

    const start = () => {
        setInterval(() => void check(), CHECK_INTERVAL_MS);
    };

    return { check, start };
}
