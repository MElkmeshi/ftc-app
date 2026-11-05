import { useState } from 'react';

/**
 * When `value` last changed, for "Updated 10:42:07" labels on live pages.
 * Live props arrive as new objects, so identity is enough.
 */
export function useChangedAt(value: unknown): Date {
    const [seen, setSeen] = useState(() => ({ value, at: new Date() }));

    if (seen.value !== value) {
        const next = { value, at: new Date() };
        setSeen(next);

        return next.at;
    }

    return seen.at;
}
