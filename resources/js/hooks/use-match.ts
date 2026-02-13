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

export function useMatch(id: number | null, refetchInterval?: number) {
    const api = useApi();
    return useQuery<CompetitionMatch>({
        queryKey: ['matches', id],
        queryFn: () => (id ? api.getMatch(id) : Promise.reject()),
        enabled: !!id,
        refetchInterval: refetchInterval || false,
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
        mutationFn: (params: { match_id: number; team_id?: number; alliance_id?: number; score_type_id: number }) => api.addScore(params),
        onMutate: async (params) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['matches', params.match_id] });

            // Snapshot the previous value
            const previousMatch = queryClient.getQueryData<CompetitionMatch>(['matches', params.match_id]);

            // Optimistically update the cache
            if (previousMatch) {
                queryClient.setQueryData<CompetitionMatch>(['matches', params.match_id], (old) => {
                    if (!old) return old;

                    // Get the score type to know the points value
                    const scoreTypes = queryClient.getQueryData<ScoreType[]>(['score-types']) || [];
                    const scoreType = scoreTypes.find((st) => st.id === params.score_type_id);

                    if (!scoreType) return old;

                    // Create a new score entry (optimistic)
                    const newScore = {
                        id: Date.now(), // Temporary ID
                        match_id: params.match_id,
                        team_id: params.team_id || null,
                        alliance_id: params.alliance_id || null,
                        score_type_id: params.score_type_id,
                        score_type: scoreType,
                        created_at: new Date().toISOString(),
                    };

                    // Update match alliances scores if it's a team score
                    const updatedMatchAlliances = params.team_id
                        ? old.match_alliances.map((ma) => (ma.team.id === params.team_id ? { ...ma, score: ma.score + scoreType.points } : ma))
                        : old.match_alliances;

                    return {
                        ...old,
                        scores: [...(old.scores || []), newScore],
                        match_alliances: updatedMatchAlliances,
                    };
                });
            }

            return { previousMatch };
        },
        onError: (_err, params, context) => {
            // Rollback on error
            if (context?.previousMatch) {
                queryClient.setQueryData(['matches', params.match_id], context.previousMatch);
            }
        },
        onSuccess: (_data, params) => {
            // Invalidate to get fresh data from server
            queryClient.invalidateQueries({ queryKey: ['matches', params.match_id] });
        },
    });
}

export function useDeleteScore() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { scoreId: number; matchId: number; teamId?: number; points: number }) => api.deleteScore(params.scoreId),
        onMutate: async (params) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['matches', params.matchId] });

            // Snapshot the previous value
            const previousMatch = queryClient.getQueryData<CompetitionMatch>(['matches', params.matchId]);

            // Optimistically update the cache
            if (previousMatch) {
                queryClient.setQueryData<CompetitionMatch>(['matches', params.matchId], (old) => {
                    if (!old) return old;

                    // Remove the score from the scores array
                    const updatedScores = (old.scores || []).filter((score) => score.id !== params.scoreId);

                    // Update match alliances scores if it's a team score
                    const updatedMatchAlliances = params.teamId
                        ? old.match_alliances.map((ma) => (ma.team.id === params.teamId ? { ...ma, score: ma.score - params.points } : ma))
                        : old.match_alliances;

                    return {
                        ...old,
                        scores: updatedScores,
                        match_alliances: updatedMatchAlliances,
                    };
                });
            }

            return { previousMatch };
        },
        onError: (_err, params, context) => {
            // Rollback on error
            if (context?.previousMatch) {
                queryClient.setQueryData(['matches', params.matchId], context.previousMatch);
            }
        },
        onSuccess: (_data, params) => {
            // Invalidate to get fresh data from server
            queryClient.invalidateQueries({ queryKey: ['matches', params.matchId] });
        },
    });
}

export function useLoadedMatch(refetchInterval?: number) {
    const api = useApi();
    return useQuery<CompetitionMatch | null>({
        queryKey: ['loaded-match'],
        queryFn: api.getLoadedMatch,
        refetchInterval: refetchInterval || false,
    });
}

export function useLoadMatch() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: number) => api.loadMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loaded-match'] });
        },
    });
}

export function useStartMatch() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: number) => api.startMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        },
    });
}

export function useEndMatch() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: number) => api.endMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        },
    });
}

export function useCancelMatch() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (matchId: number) => api.cancelMatch(matchId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        },
    });
}

export function useTeamsDisplay(refetchInterval?: number) {
    const api = useApi();
    return useQuery({
        queryKey: ['teams-display'],
        queryFn: api.getTeamsDisplay,
        refetchInterval: refetchInterval || false,
    });
}
