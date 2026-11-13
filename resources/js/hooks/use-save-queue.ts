import { router } from '@inertiajs/react';
import { useCallback, useRef, useState } from 'react';

type Method = 'post' | 'put' | 'delete';
type Send = () => Promise<boolean>;

interface QueuedSave {
    key: string;
    send: Send;
    settle: ((saved: boolean) => void)[];
}

export type QueueSave = (key: string, method: Method, url: string, data?: Record<string, unknown>) => Promise<boolean>;

let lastOneOffSave = 0;

/**
 * A key for a save that must never be merged with another one, such as
 * adding a slot twice in a row.
 */
export function oneOffSaveKey(): string {
    return `one-off-${++lastOneOffSave}`;
}

function visit(method: Method, url: string, data: Record<string, unknown>): Promise<boolean> {
    return new Promise((resolve) => {
        let saved = false;

        router.visit(url, {
            method,
            data: data as never,
            async: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                saved = true;
            },
            onFinish: () => resolve(saved),
            onCancel: () => resolve(false),
        });
    });
}

/**
 * Saves edits one after another, like FTC Live's awards pages: every change
 * is sent as it is made, never two at once, and in the order they were made.
 * A change that is still waiting is replaced by a newer change to the same
 * thing, unless something else was changed in between.
 */
export function createSaveQueue(
    send: (method: Method, url: string, data: Record<string, unknown>) => Promise<boolean>,
    onPendingChange: (pending: number) => void,
) {
    const waiting: QueuedSave[] = [];
    let running = false;

    const drain = async () => {
        if (running) {
            return;
        }

        running = true;

        for (let next = waiting.shift(); next !== undefined; next = waiting.shift()) {
            onPendingChange(waiting.length + 1);
            const saved = await next.send().catch(() => false);
            next.settle.forEach((settle) => settle(saved));
        }

        running = false;
        onPendingChange(0);
    };

    return (key: string, method: Method, url: string, data: Record<string, unknown> = {}): Promise<boolean> =>
        new Promise((settle) => {
            const queued = waiting.at(-1);

            if (queued?.key === key) {
                queued.send = () => send(method, url, data);
                queued.settle.push(settle);
            } else {
                waiting.push({ key, send: () => send(method, url, data), settle: [settle] });
            }

            onPendingChange(waiting.length + (running ? 1 : 0));
            void drain();
        });
}

export function useSaveQueue(): { save: QueueSave; pending: number; failed: boolean } {
    const [pending, setPending] = useState(0);
    const [failed, setFailed] = useState(false);
    const queue = useRef<QueueSave | null>(null);
    const save = useCallback<QueueSave>(async (key, method, url, data) => {
        queue.current ??= createSaveQueue(visit, setPending);
        setFailed(false);

        const saved = await queue.current(key, method, url, data);

        if (!saved) {
            setFailed(true);
        }

        return saved;
    }, []);

    return { save, pending, failed };
}
