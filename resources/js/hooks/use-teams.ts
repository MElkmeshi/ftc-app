import { Team } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useTeams() {
    const api = useApi();
    return useQuery<Team[]>({
        queryKey: ['teams'],
        queryFn: api.getTeams,
    });
}

export function useCreateTeam() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { number: number; name: string }) => api.createTeam(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}

export function useUpdateTeam() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { id: number; data: { number: number; name: string } }) => api.updateTeam(params.id, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}

export function useDeleteTeam() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteTeam(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}
