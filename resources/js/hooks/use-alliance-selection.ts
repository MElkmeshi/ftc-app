import { AllianceGroup, AllianceSelectionStatus, AllianceSelectionUpdatedEvent, Team, TeamDisplay } from '@/types';
import { useEchoPublic } from '@laravel/echo-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';
import { eventChannel } from '@/lib/event';

const ALLIANCE_SELECTION_KEYS = [
    ['alliance-groups'],
    ['available-teams'],
    ['declined-teams'],
    ['alliance-selection-status'],
    ['alliance-selection-rankings'],
] as const;

function useInvalidateAllianceSelection() {
    const queryClient = useQueryClient();

    return () => {
        ALLIANCE_SELECTION_KEYS.forEach((queryKey) => queryClient.invalidateQueries({ queryKey: [...queryKey] }));
    };
}

/**
 * Server-pushed selection state. The broadcast carries the full picture, so the
 * caches that map onto it are written directly and the rest are invalidated —
 * a refresh or reconnect re-fetches and lands in the same place.
 */
export function useAllianceSelectionEcho(onUpdate?: (event: AllianceSelectionUpdatedEvent) => void) {
    const queryClient = useQueryClient();

    useEchoPublic<AllianceSelectionUpdatedEvent>(eventChannel('alliance-selection'), 'AllianceSelectionUpdated', (event) => {
        queryClient.setQueryData(['alliance-groups'], event.groups);
        queryClient.setQueryData(['declined-teams'], event.declined_teams);
        queryClient.setQueryData<AllianceSelectionStatus>(['alliance-selection-status'], {
            started: event.groups.length > 0,
            complete: event.complete,
            current_pick_seed: event.current_pick_seed,
            groups: event.groups,
            declined_teams: event.declined_teams,
        });

        queryClient.invalidateQueries({ queryKey: ['available-teams'] });
        queryClient.invalidateQueries({ queryKey: ['alliance-selection-rankings'] });

        onUpdate?.(event);
    });
}

export function useAllianceSelectionRankings(refetchInterval?: number) {
    const api = useApi();
    return useQuery<TeamDisplay[]>({
        queryKey: ['alliance-selection-rankings'],
        queryFn: api.getAllianceSelectionRankings,
        refetchInterval: refetchInterval ?? false,
    });
}

export function useAllianceGroups(refetchInterval?: number) {
    const api = useApi();
    return useQuery<AllianceGroup[]>({
        queryKey: ['alliance-groups'],
        queryFn: api.getAllianceGroups,
        refetchInterval: refetchInterval ?? false,
    });
}

export function useAvailableTeams() {
    const api = useApi();
    return useQuery<Team[]>({
        queryKey: ['available-teams'],
        queryFn: api.getAvailableTeams,
    });
}

export function useDeclinedTeams() {
    const api = useApi();
    return useQuery<Team[]>({
        queryKey: ['declined-teams'],
        queryFn: api.getDeclinedTeams,
    });
}

export function useAllianceSelectionStatus(refetchInterval?: number) {
    const api = useApi();
    return useQuery<AllianceSelectionStatus>({
        queryKey: ['alliance-selection-status'],
        queryFn: api.getAllianceSelectionStatus,
        refetchInterval: refetchInterval ?? false,
    });
}

export function useStartAllianceSelection() {
    const api = useApi();
    const invalidate = useInvalidateAllianceSelection();
    return useMutation({
        mutationFn: (numberOfAlliances: number) => api.startAllianceSelection(numberOfAlliances),
        onSuccess: invalidate,
    });
}

export function useInviteTeam() {
    const api = useApi();
    const invalidate = useInvalidateAllianceSelection();
    return useMutation({
        mutationFn: (params: { allianceGroupId: number; teamId: number }) => api.inviteTeam(params.allianceGroupId, params.teamId),
        onSuccess: invalidate,
    });
}

export function useAcceptPick() {
    const api = useApi();
    const invalidate = useInvalidateAllianceSelection();
    return useMutation({
        mutationFn: (allianceGroupId: number) => api.acceptPick(allianceGroupId),
        onSuccess: invalidate,
    });
}

export function useDeclinePick() {
    const api = useApi();
    const invalidate = useInvalidateAllianceSelection();
    return useMutation({
        mutationFn: (allianceGroupId: number) => api.declinePick(allianceGroupId),
        onSuccess: invalidate,
    });
}

export function useResetAllianceSelection() {
    const api = useApi();
    const invalidate = useInvalidateAllianceSelection();
    return useMutation({
        mutationFn: () => api.resetAllianceSelection(),
        onSuccess: invalidate,
    });
}
