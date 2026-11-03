import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useMatch, useMatches, useScoreTypes, useSetAllianceSubmitted, useSetScoreCount } from '@/hooks/use-match';
import { useRefereeField } from '@/hooks/use-referee-field';
import { useRefereeSeat } from '@/hooks/use-referee-seat';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { type ScoreControl, splitScoreTypes } from '@/lib/score-controls';
import { countScores } from '@/lib/score-count';
import { type ScoreTarget, type ScoreType } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface ScoringGroup {
    /** Score types tapped with − / +. */
    alliance: ScoreType[];
    team: ScoreType[];
    /** Yes/no and "one of" score types, picked with buttons. */
    allianceControls: ScoreControl[];
    teamControls: ScoreControl[];
}

export function useScoringPage() {
    const [selectedAllianceId, setSelectedAllianceId] = useState<number | null>(null);
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const setScoreCount = useSetScoreCount();
    const setAllianceSubmitted = useSetAllianceSubmitted();

    const [refereeField] = useRefereeField();
    const { data: matches = [] } = useMatches();
    const { activeMatch } = useActiveMatchTimer({ field: refereeField });
    const { data: match, isLoading } = useMatch(selectedMatchId, 15000);
    const { data: scoreTypes = [] } = useScoreTypes();

    const ongoingMatches = useMemo(
        () => matches.filter((m) => m.status === 'ongoing' && (!refereeField || m.field === refereeField)),
        [matches, refereeField],
    );

    // Moving the tablet to another field drops the match it was scoring.
    const [scoringField, setScoringField] = useState(refereeField);
    if (scoringField !== refereeField) {
        setScoringField(refereeField);
        setSelectedMatchId(null);
        setSelectedAllianceId(null);
    }

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

    /**
     * Per group: the − / + score types for the alliance and for each robot,
     * and the yes/no and "one of" controls, which are picked with buttons.
     */
    const groupedScoreTypes = useMemo(() => {
        const byGroup: Record<string, { alliance: ScoreType[]; team: ScoreType[] }> = { ungrouped: { alliance: [], team: [] } };
        scoreTypes.forEach((st) => {
            const key = st.group?.name ?? 'ungrouped';
            byGroup[key] ??= { alliance: [], team: [] };
            byGroup[key][st.target === 'alliance' ? 'alliance' : 'team'].push(st);
        });

        const grouped: Record<string, ScoringGroup> = {};
        Object.entries(byGroup).forEach(([key, { alliance, team }]) => {
            const allianceSplit = splitScoreTypes(alliance);
            const teamSplit = splitScoreTypes(team);
            grouped[key] = {
                alliance: allianceSplit.counters,
                team: teamSplit.counters,
                allianceControls: allianceSplit.controls,
                teamControls: teamSplit.controls,
            };
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

    const getTotalAllianceScore = useCallback(() => {
        const teamTotal = teamsInAlliance.reduce((sum, ma) => sum + ma.score, 0);
        const allianceTotal = (match?.scores ?? [])
            .filter((s) => s.alliance_id === selectedAllianceId && !s.team_id)
            .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0);
        return teamTotal + allianceTotal;
    }, [teamsInAlliance, match, selectedAllianceId]);

    const getAllianceScoreTypeCount = useCallback(
        (scoreTypeId: number) => (selectedAllianceId ? countScores(match, scoreTypeId, { allianceId: selectedAllianceId }) : 0),
        [match, selectedAllianceId],
    );

    const getTeamScoreTypeCount = useCallback((scoreTypeId: number, teamId: number) => countScores(match, scoreTypeId, { teamId }), [match]);

    /** Sends the new absolute count, one more or one less than shown. */
    const changeCount = useCallback(
        (scoreTypeId: number, target: ScoreTarget, delta: 1 | -1) => {
            const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
            if (!match || !scoreType || (!target.teamId && !target.allianceId)) return;
            const current = countScores(match, scoreTypeId, target);
            if (current + delta < 0) return;
            setScoreCount.mutate({
                match,
                scoreType,
                target: target.teamId ? { teamId: target.teamId } : { allianceId: target.allianceId },
                count: current + delta,
            });
        },
        [match, scoreTypes, setScoreCount],
    );

    const handleAddScore = useCallback((scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, 1), [changeCount]);
    const handleRemoveScore = useCallback((scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, -1), [changeCount]);

    const submission = match?.submissions?.find((entry) => entry.alliance_id === selectedAllianceId) ?? null;

    const setSubmitted = useCallback(
        (submitted: boolean) => {
            if (!match || !selectedAllianceId) return;
            setAllianceSubmitted.mutate({ matchId: match.id, allianceId: selectedAllianceId, submitted });
        },
        [match, selectedAllianceId, setAllianceSubmitted],
    );

    const sharingSeatWith = useRefereeSeat(match?.status === 'ongoing' ? match.id : null, selectedAllianceId);

    /** A submitted alliance is locked on the tablet until its referee reopens it. */
    const isPending = match?.status === 'ongoing' && submission !== null;

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
        allianceName: `${allianceColor.charAt(0).toUpperCase()}${allianceColor.slice(1)} alliance`,
        submission,
        setSubmitted,
        isSubmitPending: setAllianceSubmitted.isPending,
        submitError: setAllianceSubmitted.error,
        sharingSeatWith,
        isPending,
    };
}
