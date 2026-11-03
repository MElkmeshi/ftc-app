import { afterEach, describe, expect, it, vi } from 'vitest';
import { serverClockOffset, serverNow, syncServerClock } from './server-clock';

describe('server clock', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('adopts the offset from the fastest round trip', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(1_000_000);

        // The server is 5 s ahead. The first sample is slow (and so less
        // trustworthy); the fast ones should win.
        const roundTrips = [400, 20, 20, 20];
        let call = 0;

        vi.stubGlobal('fetch', async () => {
            const sentAt = Date.now();
            const roundTrip = roundTrips[call++];
            vi.setSystemTime(sentAt + roundTrip);

            return { json: async () => ({ now: sentAt + roundTrip / 2 + 5000 + (roundTrip > 100 ? 300 : 0) }) };
        });

        await syncServerClock();

        expect(serverClockOffset()).toBe(5000);
        expect(serverNow() - Date.now()).toBe(5000);
    });

    it('keeps the previous offset when the server cannot be reached', async () => {
        const before = serverClockOffset();
        vi.stubGlobal('fetch', async () => {
            throw new Error('offline');
        });

        await syncServerClock();

        expect(serverClockOffset()).toBe(before);
    });
});
