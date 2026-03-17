import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useAddScore, useDeleteScore, useEndMatch, useMatch, useMatches, useScoreTypes } from '@/hooks/use-match';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { useEcho } from '@laravel/echo-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useScoringPage() {
    const [selectedAllianceId, setSelectedAllianceId] = useState<number | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const addScore = useAddScore();
    const deleteScore = useDeleteScore();
    const endMatch = useEndMatch();

    const { data: matches = [] } = useMatches();
    const { activeMatch } = useActiveMatchTimer();
    const { data: match, isLoading } = useMatch(selectedMatchId, 3000);
    const { data: scoreTypes = [] } = useScoreTypes();

    const ongoingMatches = useMemo(() => matches.filter((m) => m.status === 'ongoing'), [matches]);

    useEffect(() => {
        if (activeMatch && !selectedMatchId) {
            setSelectedMatchId(activeMatch.id);
        }
    }, [activeMatch, selectedMatchId]);

    useEffect(() => {
        if (match && !selectedAllianceId && ongoingMatches.length === 1) {
            const firstAlliance = match.match_alliances[0]?.alliance;
            if (firstAlliance) {
                setSelectedAllianceId(firstAlliance.id);
            }
        }
    }, [match, selectedAllianceId, ongoingMatches.length]);

    useEcho(match?.id ? `matches.${match.id}` : '', 'ScoreUpdated', () => {});

    const selectedAlliance = match?.match_alliances.find((ma) => ma.alliance.id === selectedAllianceId);
    const teamsInAlliance = useMemo(
        () => match?.match_alliances.filter((ma) => ma.alliance.id === selectedAllianceId) ?? [],
        [match, selectedAllianceId],
    );

    const allianceColor = selectedAlliance?.alliance.color ?? 'gray';
    const colorClasses = useMemo(() => getAllianceColorClasses(allianceColor), [allianceColor]);

    const alliances = useMemo(
        () =>
            match
                ? Array.from(new Set(match.match_alliances.map((ma) => ma.alliance.id))).map(
                      (id) => match.match_alliances.find((ma) => ma.alliance.id === id)?.alliance,
                  )
                : [],
        [match],
    );

    const groupedScoreTypes = useMemo(() => {
        const grouped: Record<string, { alliance: typeof scoreTypes; team: typeof scoreTypes }> = {
            ungrouped: { alliance: [], team: [] },
        };
        scoreTypes.forEach((st) => {
            const key = st.group?.name ?? 'ungrouped';
            if (!grouped[key]) {
                grouped[key] = { alliance: [], team: [] };
            }
            if (st.target === 'alliance') {
                grouped[key].alliance.push(st);
            } else {
                grouped[key].team.push(st);
            }
        });
        return grouped;
    }, [scoreTypes]);

    const sortedGroups = useMemo(
        () =>
            Object.entries(groupedScoreTypes).sort(([keyA], [keyB]) => {
                if (keyA === 'ungrouped') return 1;
                if (keyB === 'ungrouped') return -1;
                const orderA = scoreTypes.find((st) => st.group?.name === keyA)?.group?.display_order ?? 0;
                const orderB = scoreTypes.find((st) => st.group?.name === keyB)?.group?.display_order ?? 0;
                return orderA - orderB;
            }),
        [groupedScoreTypes, scoreTypes],
    );

    // Build an index Map for O(1) score lookups keyed by `a_{scoreTypeId}_{allianceId}` or `t_{scoreTypeId}_{teamId}`
    const scoresIndex = useMemo(() => {
        const matchScores = match?.scores ?? [];
        const index = new Map<string, (typeof matchScores)[number][]>();
        matchScores.forEach((score) => {
            const key = score.team_id
                ? `t_${score.score_type_id}_${score.team_id}`
                : `a_${score.score_type_id}_${score.alliance_id}`;
            const arr = index.get(key);
            if (arr) {
                arr.push(score);
            } else {
                index.set(key, [score]);
            }
        });
        index.forEach((arr) => arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
        return index;
    }, [match]);

    const getTotalAllianceScore = useCallback(() => {
        const teamTotal = teamsInAlliance.reduce((sum, ma) => sum + ma.score, 0);
        const allianceTotal = (match?.scores ?? [])
            .filter((s) => s.alliance_id === selectedAllianceId && !s.team_id)
            .reduce((sum, s) => sum + (s.score_type?.points ?? 0), 0);
        return teamTotal + allianceTotal;
    }, [teamsInAlliance, match, selectedAllianceId]);

    const getAllianceScoreTypeCount = useCallback(
        (scoreTypeId: number) => {
            if (!match || !selectedAllianceId) return 0;
            return scoresIndex.get(`a_${scoreTypeId}_${selectedAllianceId}`)?.length ?? 0;
        },
        [match, selectedAllianceId, scoresIndex],
    );

    const getTeamScoreTypeCount = useCallback(
        (scoreTypeId: number, teamId: number) => {
            if (!match) return 0;
            return scoresIndex.get(`t_${scoreTypeId}_${teamId}`)?.length ?? 0;
        },
        [match, scoresIndex],
    );

    const getLatestScoreId = useCallback(
        (scoreTypeId: number, options: { allianceId?: number; teamId?: number }) => {
            if (!match) return null;
            const key = options.teamId
                ? `t_${scoreTypeId}_${options.teamId}`
                : `a_${scoreTypeId}_${options.allianceId}`;
            return scoresIndex.get(key)?.[0]?.id ?? null;
        },
        [match, scoresIndex],
    );

    const handleAddScore = useCallback(
        (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
            if (!match) return;
            if (options.allianceId) {
                addScore.mutate({ match_id: match.id, alliance_id: options.allianceId, score_type_id: scoreTypeId });
            } else if (options.teamId) {
                addScore.mutate({ match_id: match.id, team_id: options.teamId, score_type_id: scoreTypeId });
            }
        },
        [match, addScore],
    );

    const handleRemoveScore = useCallback(
        (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
            if (!match) return;
            const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
            if (!scoreType) return;
            const scoreId = getLatestScoreId(scoreTypeId, options);
            if (scoreId) {
                deleteScore.mutate({ scoreId, matchId: match.id, teamId: options.teamId, points: scoreType.points });
            }
        },
        [match, scoreTypes, getLatestScoreId, deleteScore],
    );

    const handleEndMatch = useCallback(
        (onSuccess: () => void) => {
            if (!match) return;
            endMatch.mutate(match.id, { onSuccess });
        },
        [match, endMatch],
    );

    const isPending = addScore.isPending || deleteScore.isPending;

    return {
        selectedAllianceId,
        setSelectedAllianceId,
        selectedMatchId,
        setSelectedMatchId,
        match,
        isLoading,
        ongoingMatches,
        alliances,
        allianceColor,
        colorClasses,
        sortedGroups,
        teamsInAlliance,
        scoreTypes,
        getTotalAllianceScore,
        getAllianceScoreTypeCount,
        getTeamScoreTypeCount,
        handleAddScore,
        handleRemoveScore,
        handleEndMatch,
        isPending,
        isEndMatchPending: endMatch.isPending,
    };
}
