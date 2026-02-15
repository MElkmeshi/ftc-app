import { useEffect, useState } from 'react';
import axios from 'axios';
import type { MatchTimingConfig } from './use-match-timer';

interface CompetitionConfig {
    timing: MatchTimingConfig;
    sounds: {
        enabled: boolean;
        files: Record<string, string>;
    };
}

/**
 * Hook to fetch match timing configuration from the server
 * Configuration is stored in config/competition.php
 */
export function useMatchConfig() {
    const [config, setConfig] = useState<CompetitionConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        axios
            .get<CompetitionConfig>('/api/dashboard/config')
            .then((response) => {
                setConfig(response.data);
                setLoading(false);
            })
            .catch((err) => {
                console.error('Failed to load match configuration:', err);
                setError(err.message || 'Failed to load configuration');
                setLoading(false);
            });
    }, []);

    return { config, loading, error };
}
