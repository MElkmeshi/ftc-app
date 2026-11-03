import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** How many fields the current event runs. */
export function useFieldCount(): number {
    const { event } = usePage<SharedData>().props;

    return Math.max(1, event?.field_count ?? 1);
}
