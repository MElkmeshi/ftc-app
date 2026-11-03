import { createVersionWatch } from '@/lib/app-version';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('createVersionWatch', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reloads once the server reports a newer build', async () => {
        const reload = vi.fn();
        const watch = createVersionWatch({ loadedVersion: 'old', isBusy: () => false, reload, fetchVersion: async () => 'new' });

        expect(await watch.check()).toBe(true);
        expect(reload).toHaveBeenCalledOnce();
    });

    it('stays on the page while the build is the same or unknown', async () => {
        const reload = vi.fn();

        await createVersionWatch({ loadedVersion: 'same', isBusy: () => false, reload, fetchVersion: async () => 'same' }).check();
        await createVersionWatch({ loadedVersion: null, isBusy: () => false, reload, fetchVersion: async () => 'new' }).check();
        await createVersionWatch({
            loadedVersion: 'old',
            isBusy: () => false,
            reload,
            fetchVersion: () => Promise.reject(new Error('offline')),
        }).check();

        expect(reload).not.toHaveBeenCalled();
    });

    it('waits for a scoring tap in flight before reloading', async () => {
        const reload = vi.fn();
        let busy = true;
        const watch = createVersionWatch({ loadedVersion: 'old', isBusy: () => busy, reload, fetchVersion: async () => 'new' });

        await watch.check();
        expect(reload).not.toHaveBeenCalled();

        busy = false;
        vi.advanceTimersByTime(2000);
        expect(reload).toHaveBeenCalledOnce();
    });
});
