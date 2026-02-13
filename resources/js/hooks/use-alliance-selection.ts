import { AllianceGroup, AllianceSelectionStatus, Team, TeamDisplay } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './use-api';

export function useAllianceSelectionRankings() {
    const api = useApi();
    return useQuery<TeamDisplay[]>({
        queryKey: ['alliance-selection-rankings'],
        queryFn: api.getAllianceSelectionRankings,
    });
}

export function useAllianceGroups(refetchInterval?: number) {
    const api = useApi();
    return useQuery<AllianceGroup[]>({
        queryKey: ['alliance-groups'],
        queryFn: api.getAllianceGroups,
        refetchInterval: refetchInterval || false,
    });
}

export function useAvailableTeams() {
    const api = useApi();
    return useQuery<Team[]>({
        queryKey: ['available-teams'],
        queryFn: api.getAvailableTeams,
    });
}

export function useAllianceSelectionStatus(refetchInterval?: number) {
    const api = useApi();
    return useQuery<AllianceSelectionStatus>({
        queryKey: ['alliance-selection-status'],
        queryFn: api.getAllianceSelectionStatus,
        refetchInterval: refetchInterval || false,
    });
}

export function useStartAllianceSelection() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (numberOfAlliances: number) => api.startAllianceSelection(numberOfAlliances),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alliance-groups'] });
            queryClient.invalidateQueries({ queryKey: ['available-teams'] });
            queryClient.invalidateQueries({ queryKey: ['alliance-selection-status'] });
        },
    });
}

export function usePickTeam() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (params: { allianceGroupId: number; teamId: number }) => api.pickTeam(params.allianceGroupId, params.teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alliance-groups'] });
            queryClient.invalidateQueries({ queryKey: ['available-teams'] });
            queryClient.invalidateQueries({ queryKey: ['alliance-selection-status'] });
        },
    });
}

export function useResetAllianceSelection() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => api.resetAllianceSelection(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alliance-groups'] });
            queryClient.invalidateQueries({ queryKey: ['available-teams'] });
            queryClient.invalidateQueries({ queryKey: ['alliance-selection-status'] });
            queryClient.invalidateQueries({ queryKey: ['alliance-selection-rankings'] });
        },
    });
}
