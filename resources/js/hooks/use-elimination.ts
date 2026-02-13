import { EliminationBracket } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useEliminationBracket(refetchInterval?: number) {
    const api = useApi();
    return useQuery<EliminationBracket>({
        queryKey: ['elimination-bracket'],
        queryFn: api.getEliminationBracket,
        refetchInterval: refetchInterval || false,
    });
}

export function useGenerateElimination() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.generateElimination(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elimination-bracket'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });
}

export function useCheckSeriesWinner() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (seriesId: number) => api.checkSeriesWinner(seriesId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elimination-bracket'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });
}

export function useGenerateTiebreaker() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (seriesId: number) => api.generateTiebreaker(seriesId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elimination-bracket'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });
}

export function useResetElimination() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.resetElimination(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['elimination-bracket'] });
            queryClient.invalidateQueries({ queryKey: ['matches'] });
        },
    });
}
