import { type RefereeRole } from '@/types';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'referee-role';
const listeners = new Set<() => void>();
let memoryValue: string | null = null;

function read(): string | null {
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return memoryValue;
    }
}

function write(value: RefereeRole): void {
    memoryValue = value;
    try {
        window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
        // Storage blocked: the choice lasts until the page is closed.
    }
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

/**
 * Which referee this tablet is for its alliance: the scoring referee, or the
 * penalty referee who calls the fouls that alliance's robots commit. It is
 * remembered on the tablet, like the field it scores.
 */
export function useRefereeRole(): [RefereeRole, (role: RefereeRole) => void] {
    const stored = useSyncExternalStore(subscribe, read, () => null);

    return [stored === 'penalty' ? 'penalty' : 'scoring', write];
}
