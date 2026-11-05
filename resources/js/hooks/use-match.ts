import { UnsyncedScoresError } from '@/lib/api-error';
import { apiScope, eventChannel } from '@/lib/event';
import { applyScoreCount } from '@/lib/score-count';
import { CompetitionMatch, MatchBroadcast, MatchStatusChangedEvent, RefereeRole, ScoreTarget, ScoreType, ScoreUpdatedEvent } from '@/types';
import { useEchoPublic } from '@laravel/echo-react';
import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { useApi } from './use-api';

/** Every scoring write shares this key, so a reload waits for them and they are sent one at a time, in order. */
export const SCORING_MUTATION_KEY = ['scoring'];

/** The newest revision of this match any cache already shows. */
function knownRevision(queryClient: QueryClient, matchId: number): number {
    const cached = [
        queryClient.getQueryData<CompetitionMatch>(['matches', matchId]),
        queryClient.getQueryData<CompetitionMatch[]>(['matches'])?.find((match) => match.id === matchId),
        queryClient.getQueryData<CompetitionMatch | null>(['active-match']),
    ];

    return Math.max(-1, ...cached.filter((match) => match?.id === matchId).map((match) => match?.revision ?? -1));
}

/**
 * The server's snapshot with this tablet's not-yet-confirmed taps laid back
 * on top, so a snapshot caused by another tablet never wipes a count this
 * tablet shows but has not finished sending (which its next tap would then
 * build on and lose). Counts are absolute, so reapplying one is harmless.
 */
function withPendingTaps(queryClient: QueryClient, match: CompetitionMatch): CompetitionMatch {
    const scoreTypes = queryClient.getQueryData<ScoreType[]>(['score-types', apiScope()]) ?? [];

    return queryClient
        .getMutationCache()
        .findAll({ mutationKey: SCORING_MUTATION_KEY, status: 'pending' })
        .map((mutation) => mutation.state.variables as Partial<ScoreCountVariables> | undefined)
        .filter((variables): variables is ScoreCountVariables => variables?.scoreType !== undefined && variables.match?.id === match.id)
        .reduce(
            (shown, { scoreType, target, count }) => applyScoreCount(shown, scoreType, scoreTypes.length ? scoreTypes : [scoreType], target, count),
            match,
        );
}

async function cacheMatch(queryClient: QueryClient, match: CompetitionMatch) {
    if ((match.revision ?? Infinity) < knownRevision(queryClient, match.id)) {
        return;
    }

    await Promise.all([
        queryClient.cancelQueries({ queryKey: ['matches', match.id], exact: true }),
        queryClient.cancelQueries({ queryKey: ['matches'], exact: true }),
        queryClient.cancelQueries({ queryKey: ['active-match'], exact: true }),
    ]);

    if ((match.revision ?? Infinity) < knownRevision(queryClient, match.id)) {
        return;
    }

    const shown = withPendingTaps(queryClient, match);
    queryClient.setQueryData(['matches', match.id], shown);
    queryClient.setQueryData<CompetitionMatch[]>(['matches'], (matches) => matches?.map((current) => (current.id === match.id ? shown : current)));
    queryClient.setQueryData<CompetitionMatch | null>(['active-match'], (current) => {
        if (match.status === 'ongoing') return shown;
        return current?.id === match.id ? null : current;
    });
}

/** The broadcast match itself, or the match fetched by id when it was too big to broadcast. */
export function matchFromBroadcast(event: MatchBroadcast, getMatch: (id: number) => Promise<CompetitionMatch>): Promise<CompetitionMatch> {
    return event.match ? Promise.resolve(event.match) : getMatch(event.match_id);
}

export function useMatches(refetchInterval?: number) {
    const api = useApi();
    const queryClient = useQueryClient();
    useEchoPublic<MatchStatusChangedEvent>(eventChannel('match-control'), 'MatchStatusChanged', (event) => {
        void matchFromBroadcast(event, api.getMatch).then((match) => {
            cacheMatch(queryClient, match);
            if (event.action === 'loaded') {
                queryClient.setQueryData(['loaded-match'], match);
            } else if (event.action === 'started') {
                queryClient.setQueryData(['loaded-match'], null);
            }
        });
    });
    return useQuery<CompetitionMatch[]>({
        queryKey: ['matches'],
        queryFn: api.getMatches,
        refetchInterval: refetchInterval ?? 15000,
        refetchIntervalInBackground: true, // Keep polling even in background tabs (like FTC Live)
    });
}

export function useMatch(id: number | null, refetchInterval?: number) {
    const api = useApi();
    const queryClient = useQueryClient();
    const applyBroadcast = (event: MatchBroadcast) => {
        if (event.match_id === id) void matchFromBroadcast(event, api.getMatch).then((match) => cacheMatch(queryClient, match));
    };
    useEchoPublic<ScoreUpdatedEvent>(id ? eventChannel(`matches.${id}`) : '', 'ScoreUpdated', applyBroadcast);
    useEchoPublic<MatchStatusChangedEvent>(id ? eventChannel(`matches.${id}`) : '', 'MatchStatusChanged', applyBroadcast);
    return useQuery<CompetitionMatch>({
        queryKey: ['matches', id],
        queryFn: async () => {
            if (!id) return Promise.reject();
            const fetched = await api.getMatch(id);
            const shown = queryClient.getQueryData<CompetitionMatch>(['matches', id]);
            return shown && (fetched.revision ?? Infinity) < (shown.revision ?? -1) ? shown : withPendingTaps(queryClient, fetched);
        },
        enabled: !!id,
        refetchInterval: refetchInterval || false,
    });
}

export function useActiveMatch(refetchInterval?: number) {
    const api = useApi();
    return useQuery<CompetitionMatch | null>({
        queryKey: ['active-match'],
        queryFn: api.getActiveMatch,
        refetchInterval: refetchInterval || false,
        refetchIntervalInBackground: true, // Keep polling even in background tabs (like FTC Live)
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
        queryKey: ['score-types', apiScope()],
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
                    const scoreTypes = queryClient.getQueryData<ScoreType[]>(['score-types', apiScope()]) || [];
                    const scoreType = scoreTypes.find((st) => st.id === params.score_type_id);

                    if (!scoreType) return old;

                    // Create a new score entry (optimistic)
                    const newScore = {
                        id: Date.now(), // Temporary ID
                        match_id: params.match_id,
                        team_id: params.team_id || null,
                        alliance_id: params.alliance_id || null,
                        points: scoreType.points,
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
        onSuccess: ({ match }) => cacheMatch(queryClient, match),
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
                    const removedScore = old.scores?.find((score) => score.id === params.scoreId);
                    const removedPoints = removedScore?.points ?? params.points;
                    const updatedScores = (old.scores || []).filter((score) => score.id !== params.scoreId);

                    // Update match alliances scores if it's a team score
                    const updatedMatchAlliances = params.teamId
                        ? old.match_alliances.map((ma) => (ma.team.id === params.teamId ? { ...ma, score: ma.score - removedPoints } : ma))
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
        onSuccess: ({ match }) => cacheMatch(queryClient, match),
    });
}

export function useLoadedMatch(refetchInterval?: number) {
    const api = useApi();
    return useQuery<CompetitionMatch | null>({
        queryKey: ['loaded-match'],
        queryFn: api.getLoadedMatch,
        refetchInterval: refetchInterval || false,
        refetchIntervalInBackground: true, // Keep polling even in background tabs (like FTC Live)
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
        /** `force` commits even though some alliances' referees have not submitted. */
        mutationFn: (params: number | { matchId: number; force?: boolean }) =>
            typeof params === 'number' ? api.endMatch(params) : api.endMatch(params.matchId, params.force),
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

export interface ScoreCountVariables {
    match: CompetitionMatch;
    scoreType: ScoreType;
    target: ScoreTarget;
    count: number;
}

/**
 * Counts the server never confirmed (every retry failed), with the latest
 * count the referee wanted, so submitting can resend them first and refuse
 * to lock scores the server does not have.
 */
const unsyncedCounts = new Map<string, ScoreCountVariables>();
const unsyncedListeners = new Set<() => void>();
const unsyncedKey = ({ match, scoreType, target }: ScoreCountVariables) =>
    `${match.id}:${scoreType.id}:${target.teamId ?? ''}:${target.allianceId ?? ''}`;

function setUnsynced(variables: ScoreCountVariables, unsynced: boolean) {
    const key = unsyncedKey(variables);
    if (unsynced) {
        unsyncedCounts.set(key, variables);
    } else if (!unsyncedCounts.delete(key)) {
        return;
    }
    unsyncedListeners.forEach((listener) => listener());
}

export function unsyncedCountsFor(matchId: number): ScoreCountVariables[] {
    return [...unsyncedCounts.values()].filter((variables) => variables.match.id === matchId);
}

/** How many score counts on this match have not reached the server. */
export function useUnsyncedCount(matchId: number | null | undefined): number {
    return useSyncExternalStore(
        (listener) => {
            unsyncedListeners.add(listener);
            return () => unsyncedListeners.delete(listener);
        },
        () => (matchId ? unsyncedCountsFor(matchId).length : 0),
    );
}

/**
 * Sets how many times a score type is scored for one robot or alliance, like
 * FTC Live's referee snapshots. Taps go out one at a time and in order, the
 * tablet shows the new count at once, and the server's answer is only applied
 * once no later tap is still waiting (so the count never jumps back).
 */
export function useSetScoreCount() {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: SCORING_MUTATION_KEY,
        scope: { id: 'scoring' },
        mutationFn: (params: ScoreCountVariables) =>
            api.setScoreCount({
                match_id: params.match.id,
                score_type_id: params.scoreType.id,
                team_id: params.target.teamId,
                alliance_id: params.target.allianceId,
                count: params.count,
            }),
        onMutate: async ({ match, scoreType, target, count }) => {
            await queryClient.cancelQueries({ queryKey: ['matches', match.id], exact: true });
            const scoreTypes = queryClient.getQueryData<ScoreType[]>(['score-types', apiScope()]) ?? [scoreType];
            queryClient.setQueryData<CompetitionMatch>(['matches', match.id], (current) =>
                current ? applyScoreCount(current, scoreType, scoreTypes, target, count) : current,
            );
        },
        onError: (_error, variables) => {
            setUnsynced(variables, true);
            return queryClient.invalidateQueries({ queryKey: ['matches', variables.match.id], exact: true });
        },
        onSuccess: ({ match }, variables) => {
            setUnsynced(variables, false);
            if (queryClient.isMutating({ mutationKey: SCORING_MUTATION_KEY }) <= 1) {
                return cacheMatch(queryClient, match);
            }
        },
    });
}

/** Submits what one referee seat entered (locking it), or reopens it for changes. */
export function useSetAllianceSubmitted() {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation({
        mutationKey: SCORING_MUTATION_KEY,
        scope: { id: 'scoring' },
        mutationFn: async (params: { matchId: number; allianceId: number; role: RefereeRole; submitted: boolean }) => {
            if (params.submitted && unsyncedCountsFor(params.matchId).length > 0) {
                throw new UnsyncedScoresError();
            }
            return api.setAllianceSubmitted(params.matchId, params.allianceId, params.role, params.submitted);
        },
        onSuccess: ({ match }) => cacheMatch(queryClient, match),
    });
}
