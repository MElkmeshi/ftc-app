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
        mutationFn: (params: { match_id: number; team_id: number; score_type_id: number }) => api.addScore(params),
        onMutate: async (params) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['active-match'] });

            // Snapshot the previous value
            const previousMatch = queryClient.getQueryData<CompetitionMatch>(['active-match']);

            // Optimistically update
            queryClient.setQueryData<CompetitionMatch>(['active-match'], (old) => {
                if (!old) return old;

                const scoreTypes = queryClient.getQueryData<ScoreType[]>(['score-types']);
                const scoreType = scoreTypes?.find((st) => st.id === params.score_type_id);
                if (!scoreType) return old;

                return {
                    ...old,
                    match_alliances: old.match_alliances.map((ma) =>
                        ma.team.id === params.team_id ? { ...ma, score: ma.score + scoreType.points } : ma,
                    ),
                };
            });

            return { previousMatch };
        },
        onSuccess: (data) => {
            // Replace optimistic update with server response
            if (data.match) {
                queryClient.setQueryData(['active-match'], data.match);
            }
        },
        onError: (_err, _params, context) => {
            // Rollback on error
            if (context?.previousMatch) {
                queryClient.setQueryData(['active-match'], context.previousMatch);
            }
        },
    });
}
