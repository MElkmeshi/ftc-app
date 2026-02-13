import { ScoreType } from '@/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useCreateScoreType() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; points: number; target: string; group_id: number | null }) => api.createScoreType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['score-types'] });
        },
    });
}

export function useUpdateScoreType() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { id: number; data: { name: string; points: number; target: string; group_id: number | null } }) =>
            api.updateScoreType(params.id, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['score-types'] });
        },
    });
}

export function useDeleteScoreType() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteScoreType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['score-types'] });
        },
    });
}
