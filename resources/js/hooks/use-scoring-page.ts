import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useAddScore, useDeleteScore, useEndMatch, useMatch, useMatches, useScoreTypes } from '@/hooks/use-match';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { useEcho } from '@laravel/echo-react';
import { useEffect, useState } from 'react';

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

    const ongoingMatches = matches.filter((m) => m.status === 'ongoing');

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
    const teamsInAlliance = match?.match_alliances.filter((ma) => ma.alliance.id === selectedAllianceId) ?? [];

    const allianceColor = selectedAlliance?.alliance.color ?? 'gray';
    const colorClasses = getAllianceColorClasses(allianceColor);

    const alliances = match
        ? Array.from(new Set(match.match_alliances.map((ma) => ma.alliance.id))).map(
              (id) => match.match_alliances.find((ma) => ma.alliance.id === id)?.alliance,
          )
        : [];

    const groupedScoreTypes = (() => {
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
    })();

    const sortedGroups = Object.entries(groupedScoreTypes).sort(([keyA], [keyB]) => {
        if (keyA === 'ungrouped') return 1;
        if (keyB === 'ungrouped') return -1;
        const orderA = scoreTypes.find((st) => st.group?.name === keyA)?.group?.display_order ?? 0;
        const orderB = scoreTypes.find((st) => st.group?.name === keyB)?.group?.display_order ?? 0;
        return orderA - orderB;
    });

    const getTotalAllianceScore = () => {
        const teamTotal = teamsInAlliance.reduce((sum, ma) => sum + ma.score, 0);
        const allianceTotal = (match?.scores ?? [])
            .filter((s) => s.alliance_id === selectedAllianceId && !s.team_id)
            .reduce((sum, s) => sum + (s.score_type?.points ?? 0), 0);
        return teamTotal + allianceTotal;
    };

    const getAllianceScoreTypeCount = (scoreTypeId: number) => {
        if (!match || !selectedAllianceId) return 0;
        return (match.scores ?? []).filter(
            (s) => s.score_type_id === scoreTypeId && s.alliance_id === selectedAllianceId && !s.team_id,
        ).length;
    };

    const getTeamScoreTypeCount = (scoreTypeId: number, teamId: number) => {
        if (!match) return 0;
        return (match.scores ?? []).filter((s) => s.score_type_id === scoreTypeId && s.team_id === teamId).length;
    };

    const getLatestScoreId = (scoreTypeId: number, options: { allianceId?: number; teamId?: number }) => {
        if (!match) return null;
        const scores = (match.scores ?? [])
            .filter((s) => {
                if (s.score_type_id !== scoreTypeId) return false;
                if (options.allianceId) return s.alliance_id === options.allianceId && !s.team_id;
                if (options.teamId) return s.team_id === options.teamId;
                return false;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return scores[0]?.id ?? null;
    };

    const handleAddScore = (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
        if (!match) return;
        if (options.allianceId) {
            addScore.mutate({ match_id: match.id, alliance_id: options.allianceId, score_type_id: scoreTypeId });
        } else if (options.teamId) {
            addScore.mutate({ match_id: match.id, team_id: options.teamId, score_type_id: scoreTypeId });
        }
    };

    const handleRemoveScore = (scoreTypeId: number, options: { teamId?: number; allianceId?: number }) => {
        if (!match) return;
        const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
        if (!scoreType) return;
        const scoreId = getLatestScoreId(scoreTypeId, options);
        if (scoreId) {
            deleteScore.mutate({ scoreId, matchId: match.id, teamId: options.teamId, points: scoreType.points });
        }
    };

    const handleEndMatch = (onSuccess: () => void) => {
        if (!match) return;
        endMatch.mutate(match.id, { onSuccess });
    };

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
