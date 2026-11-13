import { createSaveQueue } from '@/hooks/use-save-queue';
import { describe, expect, it, vi } from 'vitest';

function deferredSender() {
    const sent: { url: string; data: Record<string, unknown>; finish: (saved: boolean) => void }[] = [];
    const send = vi.fn(
        (_method: string, url: string, data: Record<string, unknown>) =>
            new Promise<boolean>((finish) => {
                sent.push({ url, data, finish });
            }),
    );

    return { sent, send };
}

const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('save queue', () => {
    it('sends one save at a time, in the order they were made', async () => {
        const { sent, send } = deferredSender();
        const save = createSaveQueue(send, () => {});

        void save('slot-1', 'put', '/slots/1', { team: 1 });
        void save('slot-2', 'put', '/slots/2', { team: 2 });
        await settled();

        expect(sent.map((request) => request.url)).toEqual(['/slots/1']);

        sent[0].finish(true);
        await settled();

        expect(sent.map((request) => request.url)).toEqual(['/slots/1', '/slots/2']);
    });

    it('replaces a waiting save with a newer one for the same thing, and tells both callers how it went', async () => {
        const { sent, send } = deferredSender();
        const save = createSaveQueue(send, () => {});

        void save('slot-1', 'put', '/slots/1', { name: 'S' });
        const older = save('slot-2', 'put', '/slots/2', { name: 'Sa' });
        const newer = save('slot-2', 'put', '/slots/2', { name: 'Sam' });
        await settled();
        sent[0].finish(true);
        await settled();
        sent[1].finish(true);

        expect(await Promise.all([older, newer])).toEqual([true, true]);
        expect(sent.map((request) => request.data)).toEqual([{ name: 'S' }, { name: 'Sam' }]);
    });

    it('does not replace the save that is already on its way', async () => {
        const { sent, send } = deferredSender();
        const save = createSaveQueue(send, () => {});

        void save('slot-1', 'put', '/slots/1', { name: 'S' });
        await settled();
        void save('slot-1', 'put', '/slots/1', { name: 'Sam' });
        sent[0].finish(true);
        await settled();

        expect(sent.map((request) => request.data)).toEqual([{ name: 'S' }, { name: 'Sam' }]);
    });

    it('keeps a save in its place when something else was changed after it', async () => {
        const { sent, send } = deferredSender();
        const save = createSaveQueue(send, () => {});

        void save('award', 'put', '/award');
        void save('slot-2', 'put', '/slots/2', { name: 'Sam' });
        void save('remove-slot', 'delete', '/slots');
        void save('slot-2', 'put', '/slots/2', { name: 'Alex' });

        for (let request = 0; request < 4; request++) {
            await settled();
            sent[request].finish(true);
        }

        expect(sent.map((request) => request.url)).toEqual(['/award', '/slots/2', '/slots', '/slots/2']);
    });

    it('reports how many saves are outstanding and carries on after one fails', async () => {
        const { sent, send } = deferredSender();
        const pending: number[] = [];
        const save = createSaveQueue(send, (count) => pending.push(count));

        const failed = save('slot-1', 'put', '/slots/1');
        const next = save('slot-2', 'put', '/slots/2');
        await settled();
        sent[0].finish(false);
        await settled();
        sent[1].finish(true);

        expect(await Promise.all([failed, next])).toEqual([false, true]);
        expect(pending.at(0)).toBeGreaterThan(0);
        expect(pending.at(-1)).toBe(0);
    });
});
