import { CompetitionMatch, DashboardStats, Group, ScoreType, Team, TeamDisplay } from '@/types';
import axios from 'axios';
import { useCallback } from 'react';

export const useApi = () => {
    const getMatches = useCallback(async (): Promise<CompetitionMatch[]> => {
        const res = await axios.get('/api/matches');
        return res.data;
    }, []);

    const getMatch = useCallback(async (id: number): Promise<CompetitionMatch> => {
        const res = await axios.get(`/api/matches/${id}`);
        return res.data;
    }, []);

    const getActiveMatch = useCallback(async (): Promise<CompetitionMatch> => {
        const res = await axios.get('/api/matches/active');
        return res.data;
    }, []);

    const updateScore = useCallback(async (matchId: number, scoreData: { match_alliances: { id: number; score: number }[] }) => {
        return axios.post(`/api/matches/${matchId}/update-score`, scoreData);
    }, []);

    const getScoreTypes = useCallback(async (): Promise<ScoreType[]> => {
        const res = await axios.get('/api/score-types');
        return res.data;
    }, []);

    const addScore = useCallback(async (scoreData: { match_id: number; team_id?: number; alliance_id?: number; score_type_id: number }) => {
        const res = await axios.post<{ match: CompetitionMatch }>('/api/scores', scoreData);
        return res.data;
    }, []);

    const deleteScore = useCallback(async (scoreId: number) => {
        const res = await axios.delete<{ match: CompetitionMatch }>(`/api/scores/${scoreId}`);
        return res.data;
    }, []);

    const getTeamsDisplay = useCallback(async (): Promise<TeamDisplay[]> => {
        const res = await axios.get('/api/matches/teams-display');
        return res.data;
    }, []);

    const loadMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        const res = await axios.post('/api/matches/load', { match_id: matchId });
        return res.data;
    }, []);

    const getLoadedMatch = useCallback(async (): Promise<CompetitionMatch | null> => {
        const res = await axios.get('/api/matches/loaded');
        return res.data;
    }, []);

    const startMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        const res = await axios.post('/api/matches/start', { match_id: matchId });
        return res.data;
    }, []);

    const endMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        const res = await axios.post('/api/matches/end', { match_id: matchId });
        return res.data;
    }, []);

    const cancelMatch = useCallback(async (matchId: number): Promise<CompetitionMatch> => {
        const res = await axios.post('/api/matches/cancel', { match_id: matchId });
        return res.data;
    }, []);

    // Teams
    const getTeams = useCallback(async (): Promise<Team[]> => {
        const res = await axios.get('/api/teams');
        return res.data;
    }, []);

    const createTeam = useCallback(async (data: { number: number; name: string }): Promise<Team> => {
        const res = await axios.post('/api/teams', data);
        return res.data;
    }, []);

    const updateTeam = useCallback(async (id: number, data: { number: number; name: string }): Promise<Team> => {
        const res = await axios.put(`/api/teams/${id}`, data);
        return res.data;
    }, []);

    const deleteTeam = useCallback(async (id: number): Promise<void> => {
        await axios.delete(`/api/teams/${id}`);
    }, []);

    // Score Types CRUD
    const createScoreType = useCallback(
        async (data: { name: string; points: number; target: string; group_id: number | null }): Promise<ScoreType> => {
            const res = await axios.post('/api/score-types', data);
            return res.data;
        },
        [],
    );

    const updateScoreType = useCallback(
        async (id: number, data: { name: string; points: number; target: string; group_id: number | null }): Promise<ScoreType> => {
            const res = await axios.put(`/api/score-types/${id}`, data);
            return res.data;
        },
        [],
    );

    const deleteScoreType = useCallback(async (id: number): Promise<void> => {
        await axios.delete(`/api/score-types/${id}`);
    }, []);

    // Groups
    const getGroups = useCallback(async (): Promise<Group[]> => {
        const res = await axios.get('/api/groups');
        return res.data;
    }, []);

    const createGroup = useCallback(async (data: { name: string; description: string | null; display_order: number }): Promise<Group> => {
        const res = await axios.post('/api/groups', data);
        return res.data;
    }, []);

    const updateGroup = useCallback(
        async (id: number, data: { name: string; description: string | null; display_order: number }): Promise<Group> => {
            const res = await axios.put(`/api/groups/${id}`, data);
            return res.data;
        },
        [],
    );

    const deleteGroup = useCallback(async (id: number): Promise<void> => {
        await axios.delete(`/api/groups/${id}`);
    }, []);

    // Dashboard
    const getDashboardStats = useCallback(async (): Promise<DashboardStats> => {
        const res = await axios.get('/api/dashboard/stats');
        return res.data;
    }, []);

    // Match Schedule
    const generateSchedule = useCallback(async (data: { matches_per_team: number; teams_per_alliance: number }): Promise<void> => {
        await axios.post('/api/matches/generate-schedule', data);
    }, []);

    const deleteAllMatches = useCallback(async (): Promise<void> => {
        await axios.delete('/api/matches/delete-all');
    }, []);

    return {
        getMatches,
        getMatch,
        getActiveMatch,
        updateScore,
        getScoreTypes,
        addScore,
        deleteScore,
        getTeamsDisplay,
        loadMatch,
        getLoadedMatch,
        startMatch,
        endMatch,
        cancelMatch,
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
    };
};
