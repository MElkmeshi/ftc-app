import { CompetitionMatch } from '@/types';
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

    return { getMatches, getMatch, getActiveMatch, updateScore };
};
