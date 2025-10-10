import { CompetitionMatch, ScoreType } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useMatches() {
    const api = useApi();
    return useQuery<CompetitionMatch[]>({
        queryKey: ['matches'],
        queryFn: api.getMatches,
    });
}

export function useMatch(id: number | null) {
    const api = useApi();
    return useQuery<CompetitionMatch>({
        queryKey: ['matches', id],
        queryFn: () => (id ? api.getMatch(id) : Promise.reject()),
        enabled: !!id,
    });
}

export function useActiveMatch(refetchInterval?: number) {
    const api = useApi();
    return useQuery<CompetitionMatch>({
        queryKey: ['active-match'],
        queryFn: api.getActiveMatch,
        refetchInterval: refetchInterval || false,
    });
}

export function useUpdateScore() {
    const api = useApi();
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

export function useScoreTypes() {
    const api = useApi();
    return useQuery<ScoreType[]>({
        queryKey: ['score-types'],
        queryFn: api.getScoreTypes,
        staleTime: Infinity,
    });
}

export function useAddScore() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { match_id: number; team_id?: number; alliance_id?: number; score_type_id: number }) =>
            api.addScore(params),
        onSuccess: () => {
            // Invalidate to trigger refetch with fresh data
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        },
    });
}
