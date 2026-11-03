/**
 * Keeps every screen's match timer on the server's clock, not the device's.
 *
 * Match start times come from the server, so a tablet or display whose clock
 * is a few seconds off would otherwise show the wrong time remaining and
 * play sounds early or late. Like NTP, we sample the server time a few times,
 * keep the sample with the shortest round trip and assume the reply was
 * produced halfway through it.
 */

const SAMPLES = 4;
const RESYNC_INTERVAL_MS = 5 * 60 * 1000;

let offsetMs = 0;
let started = false;

/** Milliseconds since the epoch, on the server's clock. */
export function serverNow(): number {
    return Date.now() + offsetMs;
}

export function serverClockOffset(): number {
    return offsetMs;
}

async function sample(): Promise<{ offset: number; roundTrip: number } | null> {
    const sentAt = Date.now();

    try {
        const response = await fetch('/server-time', { headers: { Accept: 'application/json' }, cache: 'no-store' });
        const receivedAt = Date.now();
        const { now } = (await response.json()) as { now: number };

        return { offset: now - (sentAt + receivedAt) / 2, roundTrip: receivedAt - sentAt };
    } catch {
        return null;
    }
}

export async function syncServerClock(): Promise<void> {
    let best: { offset: number; roundTrip: number } | null = null;

    for (let i = 0; i < SAMPLES; i++) {
        const result = await sample();

        if (result && (!best || result.roundTrip < best.roundTrip)) {
            best = result;
        }
    }

    if (best) {
        offsetMs = Math.round(best.offset);
    }
}

/** Starts syncing in the background and keeps the offset fresh. Safe to call more than once. */
export function startServerClockSync(): void {
    if (started) {
        return;
    }

    started = true;
    void syncServerClock();
    setInterval(() => void syncServerClock(), RESYNC_INTERVAL_MS);
}
