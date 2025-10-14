import { CompetitionMatch, ScoreType } from '@/types';
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

    return { getMatches, getMatch, getActiveMatch, updateScore, getScoreTypes, addScore, deleteScore };
};
