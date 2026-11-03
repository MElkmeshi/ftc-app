import { useFieldCount } from '@/hooks/use-field-count';
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'referee-field';
const listeners = new Set<() => void>();
let memoryValue: string | null = null;

function read(): string | null {
    try {
        return window.localStorage.getItem(STORAGE_KEY);
    } catch {
        return memoryValue;
    }
}

function write(value: string | null): void {
    memoryValue = value;
    try {
        if (value === null) {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, value);
        }
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
 * Which field this referee tablet scores, like FTC Live's per-field scoring.
 * It is remembered on the tablet; null (or a single-field event) means the
 * tablet follows whichever match is running.
 */
export function useRefereeField(): [number | null, (field: number | null) => void] {
    const fieldCount = useFieldCount();
    const stored = Number(useSyncExternalStore(subscribe, read, () => null));
    const field = fieldCount > 1 && Number.isInteger(stored) && stored >= 1 && stored <= fieldCount ? stored : null;

    return [field, (next) => write(next === null ? null : String(next))];
}
