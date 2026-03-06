import { usePage } from '@inertiajs/react';
import type { MatchTimingConfig } from './use-match-timer';

interface CompetitionConfig {
    timing: MatchTimingConfig;
    sounds: {
        enabled: boolean;
        files: Record<string, string>;
    };
}

/**
 * Hook to get match timing configuration from Inertia shared props.
 * Configuration is shared via HandleInertiaRequests middleware.
 */
export function useMatchConfig() {
    const { matchConfig } = usePage<{ matchConfig: CompetitionConfig }>().props;

    return {
        config: matchConfig ?? null,
        loading: false,
        error: null,
    };
}
