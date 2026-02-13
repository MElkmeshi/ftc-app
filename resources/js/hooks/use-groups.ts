import { Group } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useGroups() {
    const api = useApi();
    return useQuery<Group[]>({
        queryKey: ['groups'],
        queryFn: api.getGroups,
    });
}

export function useCreateGroup() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { name: string; description: string | null; display_order: number }) => api.createGroup(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

export function useUpdateGroup() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { id: number; data: { name: string; description: string | null; display_order: number } }) =>
            api.updateGroup(params.id, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}

export function useDeleteGroup() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => api.deleteGroup(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
        },
    });
}
