import { type ScheduleTimingValue } from '@/components/schedule-timing-fields';
import { type DisplayConfig } from '@/lib/display-config';
import { eventApiUrl } from '@/lib/event';
import {
    AllianceGroup,
    AllianceSelectionStatus,
    AudienceDisplayState,
    CompetitionMatch,
    ConnectedDisplay,
    DashboardStats,
    DisplayModeValue,
    EliminationBracket,
    Group,
    ScoreType,
    Team,
    TeamDisplay,
    type ScoreKind,
} from '@/types';
import { http } from '@inertiajs/react';
import { useCallback } from 'react';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

const client = http.getClient();

async function request<T>(method: Method, url: string, data?: unknown): Promise<T> {
    const response = await client.request({
        method,
        url: eventApiUrl(url),
        data: data ? JSON.stringify(data) : undefined,
        headers: {
            Accept: 'application/json',
            ...(data ? { 'Content-Type': 'application/json' } : {}),
        },
    });
    return JSON.parse(response.data);
}

const RETRY_DELAYS_MS = [300, 1000, 2500];

/** True when the request never got an HTTP response (Wi-Fi drop, server restart), so it is safe to resend. */
function isNetworkFailure(error: unknown): boolean {
    return error instanceof Error && 'code' in error && error.code === 'ERR_NETWORK';
}

/**
 * Sends a write that carries its own idempotency key, retrying on network
 * failures. The server ignores repeats of the same key, so a tap that did
 * reach the server before the connection dropped is never counted twice.
 */
async function sendIdempotent<T>(method: Method, url: string, data: Record<string, unknown>): Promise<T> {
    const payload = { ...data, client_request_id: crypto.randomUUID() };

    for (let attempt = 0; ; attempt++) {
        try {
            return await request<T>(method, url, payload);
        } catch (error) {
            if (!isNetworkFailure(error) || attempt >= RETRY_DELAYS_MS.length) {
                throw error;
            }

            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        }
    }
}

async function get<T>(url: string): Promise<T> {
    return request<T>('get', url);
}

/** Laravel serialises `response()->json(null)` as `{}`, so "no match" must be turned back into null. */
export function presentMatch(match: Partial<CompetitionMatch> | null): CompetitionMatch | null {
    return match?.id ? (match as CompetitionMatch) : null;
}

async function post<T>(url: string, data?: unknown): Promise<T> {
    return request<T>('post', url, data);
}

async function put<T>(url: string, data?: unknown): Promise<T> {
    return request<T>('put', url, data);
}

async function del<T = void>(url: string): Promise<T> {
    return request<T>('delete', url);
}

export const useApi = () => {
    const getMatches = useCallback(async (): Promise<CompetitionMatch[]> => {
        return get('/api/matches');
    }, []);

    const getMatch = useCallback(async (id: number): Promise<CompetitionMatch> => {
        return get(`/api/matches/${id}`);
    }, []);

    const getActiveMatch = useCallback(async (): Promise<CompetitionMatch | null> => {
        return presentMatch(await get<Partial<CompetitionMatch> | null>('/api/matches/active'));
    }, []);

    const updateScore = useCallback(async (matchId: number, scoreData: { match_alliances: { id: number; score: number }[] }) => {
        return post(`/api/matches/${matchId}/update-score`, scoreData);
    }, []);

    const getScoreTypes = useCallback(async (): Promise<ScoreType[]> => {
        return get('/api/score-types');
    }, []);

    const addScore = useCallback(async (scoreData: { match_id: number; team_id?: number; alliance_id?: number; score_type_id: number }) => {
        return sendIdempotent<{ match: CompetitionMatch }>('post', '/api/scores', scoreData);
    }, []);

    const deleteScore = useCallback(async (scoreId: number) => {
        return del<{ match: CompetitionMatch }>(`/api/scores/${scoreId}`);
    }, []);

    const loadMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        return post('/api/matches/load', { match_id: matchId });
    }, []);

    const getLoadedMatch = useCallback(async (): Promise<CompetitionMatch | null> => {
        return presentMatch(await get<Partial<CompetitionMatch> | null>('/api/matches/loaded'));
    }, []);

    const startMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        return post('/api/matches/start', { match_id: matchId });
    }, []);

    const endMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        return post('/api/matches/end', { match_id: matchId });
    }, []);

    const cancelMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        return post('/api/matches/cancel', { match_id: matchId });
    }, []);

    const setAudienceDisplay = useCallback(
        async (mode: DisplayModeValue, matchId?: number | null, message?: string): Promise<AudienceDisplayState> => {
            return put('/api/display', { mode, match_id: matchId ?? null, ...(message !== undefined && { message }) });
        },
        [],
    );

    const reportDisplay = useCallback(async (displayId: string, config: DisplayConfig): Promise<void> => {
        await post('/api/display/connected', { display_id: displayId, ...config });
    }, []);

    const getConnectedDisplays = useCallback(async (): Promise<ConnectedDisplay[]> => {
        return get('/api/display/connected');
    }, []);

    const configureDisplays = useCallback(async (displayIds: string[], changes: Partial<DisplayConfig>): Promise<ConnectedDisplay[]> => {
        return put('/api/display/connected', { display_ids: displayIds, ...changes });
    }, []);

    // Teams
    const getTeams = useCallback(async (): Promise<Team[]> => {
        return get('/api/teams');
    }, []);

    const createTeam = useCallback(async (data: { number: number; name: string }): Promise<Team> => {
        return post('/api/teams', data);
    }, []);

    const updateTeam = useCallback(async (id: number, data: { number: number; name: string }): Promise<Team> => {
        return put(`/api/teams/${id}`, data);
    }, []);

    const deleteTeam = useCallback(async (id: number): Promise<void> => {
        await del(`/api/teams/${id}`);
    }, []);

    // Score Types CRUD
    const createScoreType = useCallback(
        async (data: {
            name: string;
            points: number;
            target: string;
            kind: ScoreKind;
            choice_set: string | null;
            group_id: number | null;
        }): Promise<ScoreType> => {
            return post('/api/score-types', data);
        },
        [],
    );

    const updateScoreType = useCallback(
        async (
            id: number,
            data: { name: string; points: number; target: string; kind: ScoreKind; choice_set: string | null; group_id: number | null },
        ): Promise<ScoreType> => {
            return put(`/api/score-types/${id}`, data);
        },
        [],
    );

    const deleteScoreType = useCallback(async (id: number): Promise<void> => {
        await del(`/api/score-types/${id}`);
    }, []);

    // Groups
    const getGroups = useCallback(async (): Promise<Group[]> => {
        return get('/api/groups');
    }, []);

    const createGroup = useCallback(async (data: { name: string; description: string | null; display_order: number }): Promise<Group> => {
        return post('/api/groups', data);
    }, []);

    const updateGroup = useCallback(async (id: number, data: { name: string; description: string | null; display_order: number }): Promise<Group> => {
        return put(`/api/groups/${id}`, data);
    }, []);

    const deleteGroup = useCallback(async (id: number): Promise<void> => {
        await del(`/api/groups/${id}`);
    }, []);

    // Dashboard
    const getDashboardStats = useCallback(async (): Promise<DashboardStats> => {
        return get('/api/dashboard/stats');
    }, []);

    // Alliance Selection
    const getAllianceSelectionRankings = useCallback(async (): Promise<TeamDisplay[]> => {
        return get('/api/alliance-selection/rankings');
    }, []);

    const startAllianceSelection = useCallback(async (numberOfAlliances: number): Promise<AllianceGroup[]> => {
        return post('/api/alliance-selection/start', { number_of_alliances: numberOfAlliances });
    }, []);

    const getAllianceGroups = useCallback(async (): Promise<AllianceGroup[]> => {
        return get('/api/alliance-selection/groups');
    }, []);

    const getAvailableTeams = useCallback(async (): Promise<Team[]> => {
        return get('/api/alliance-selection/available-teams');
    }, []);

    const inviteTeam = useCallback(async (allianceGroupId: number, teamId: number): Promise<AllianceGroup> => {
        return post('/api/alliance-selection/invite', { alliance_group_id: allianceGroupId, team_id: teamId });
    }, []);

    const acceptPick = useCallback(async (allianceGroupId: number): Promise<AllianceGroup> => {
        return post('/api/alliance-selection/accept', { alliance_group_id: allianceGroupId });
    }, []);

    const declinePick = useCallback(async (allianceGroupId: number): Promise<AllianceGroup> => {
        return post('/api/alliance-selection/decline', { alliance_group_id: allianceGroupId });
    }, []);

    const getDeclinedTeams = useCallback(async (): Promise<Team[]> => {
        return get('/api/alliance-selection/declined-teams');
    }, []);

    const getAllianceSelectionStatus = useCallback(async (): Promise<AllianceSelectionStatus> => {
        return get('/api/alliance-selection/status');
    }, []);

    const resetAllianceSelection = useCallback(async (): Promise<void> => {
        await del('/api/alliance-selection/reset');
    }, []);

    // Elimination
    const generateElimination = useCallback(async (): Promise<void> => {
        await post('/api/elimination/generate');
    }, []);

    const getEliminationBracket = useCallback(async (): Promise<EliminationBracket> => {
        return get('/api/elimination/bracket');
    }, []);

    const checkSeriesWinner = useCallback(async (seriesId: number) => {
        return post(`/api/elimination/series/${seriesId}/check-winner`);
    }, []);

    const generateTiebreaker = useCallback(async (seriesId: number): Promise<CompetitionMatch> => {
        return post(`/api/elimination/series/${seriesId}/tiebreaker`);
    }, []);

    const resetElimination = useCallback(async (): Promise<void> => {
        await del('/api/elimination/reset');
    }, []);

    // Match Schedule
    const getScheduleTiming = useCallback(async (): Promise<ScheduleTimingValue> => {
        return get('/api/matches/schedule-timing');
    }, []);

    const updateScheduleTiming = useCallback(async (data: ScheduleTimingValue): Promise<ScheduleTimingValue> => {
        return put('/api/matches/schedule-timing', data);
    }, []);

    const generateSchedule = useCallback(
        async (data: { matches_per_team: number; teams_per_alliance: number } & Partial<ScheduleTimingValue>): Promise<void> => {
            await post('/api/matches/generate-schedule', data);
        },
        [],
    );

    const deleteAllMatches = useCallback(async (): Promise<void> => {
        await del('/api/matches/delete-all');
    }, []);

    return {
        getMatches,
        getMatch,
        getActiveMatch,
        updateScore,
        getScoreTypes,
        addScore,
        deleteScore,
        loadMatch,
        getLoadedMatch,
        startMatch,
        endMatch,
        cancelMatch,
        setAudienceDisplay,
        reportDisplay,
        getConnectedDisplays,
        configureDisplays,
        getScheduleTiming,
        updateScheduleTiming,
        getTeams,
        createTeam,
        updateTeam,
        deleteTeam,
        createScoreType,
        updateScoreType,
        deleteScoreType,
        getGroups,
        createGroup,
        updateGroup,
        deleteGroup,
        getDashboardStats,
        generateSchedule,
        deleteAllMatches,
        getAllianceSelectionRankings,
        startAllianceSelection,
        getAllianceGroups,
        getAvailableTeams,
        getDeclinedTeams,
        inviteTeam,
        acceptPick,
        declinePick,
        getAllianceSelectionStatus,
        resetAllianceSelection,
        generateElimination,
        getEliminationBracket,
        checkSeriesWinner,
        generateTiebreaker,
        resetElimination,
    };
};
