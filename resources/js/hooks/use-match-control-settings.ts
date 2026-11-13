import { useApi } from '@/hooks/use-api';
import { apiScope } from '@/lib/event';
import { type MatchControlSettings } from '@/types';
import { router } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const DEFAULT_MATCH_CONTROL_SETTINGS: MatchControlSettings = {
    live_scoring: true,
    require_ready: false,
    referee_tablets: true,
    flip_alliances: false,
    recorded_countdown: false,
    active_phase: null,
};

const MUTATION_KEY = ['match-control-settings', 'save'];

export function useMatchControlSettings() {
    const api = useApi();
    const queryClient = useQueryClient();
    const queryKey = ['match-control-settings', apiScope()];
    const { data } = useQuery({ queryKey, queryFn: () => api.getMatchControlSettings(), refetchInterval: 15000 });
    const save = useMutation({
        mutationKey: MUTATION_KEY,
        mutationFn: (changes: Partial<MatchControlSettings>) => api.updateMatchControlSettings(changes),
        onMutate: (changes) => {
            queryClient.setQueryData<MatchControlSettings>(queryKey, (current) => ({ ...(current ?? DEFAULT_MATCH_CONTROL_SETTINGS), ...changes }));
        },
        onSuccess: (saved, changes) => {
            if (queryClient.isMutating({ mutationKey: MUTATION_KEY }) <= 1) {
                queryClient.setQueryData(queryKey, saved);
            }

            if ('recorded_countdown' in changes) {
                void queryClient.invalidateQueries({ queryKey: ['competition-settings'] });
                router.reload({ only: ['matchConfig'] });
            }
        },
        onError: () => queryClient.invalidateQueries({ queryKey }),
    });

    return { settings: data ?? DEFAULT_MATCH_CONTROL_SETTINGS, update: save.mutate, error: save.error };
}
