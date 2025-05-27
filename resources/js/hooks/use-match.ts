import { CompetitionMatch } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

const api = useApi();

export function useMatches() {
    return useQuery<CompetitionMatch[]>({
        queryKey: ['matches'],
        queryFn: api.getMatches,
    });
}

export function useMatch(id: number | null) {
    return useQuery<CompetitionMatch>({
        queryKey: ['matches', id],
        queryFn: () => (id ? api.getMatch(id) : Promise.reject()),
        enabled: !!id,
    });
}

export function useActiveMatch() {
    return useQuery<CompetitionMatch>({
        queryKey: ['active-match'],
        queryFn: api.getActiveMatch,
    });
}

export function useUpdateScore() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { matchId: number; data: { match_alliances: { id: number; score: number }[] } }) =>
            api.updateScore(params.matchId, params.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        },
    });
}
