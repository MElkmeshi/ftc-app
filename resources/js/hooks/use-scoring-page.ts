import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import {
    unsyncedCountsFor,
    useLoadedMatch,
    useMatch,
    useMatches,
    useScoreTypes,
    useSetAllianceSubmitted,
    useSetScoreCount,
    useSetTeamReady,
    useUnsyncedCount,
} from '@/hooks/use-match';
import { useRefereeField } from '@/hooks/use-referee-field';
import { useRefereeSeat } from '@/hooks/use-referee-seat';
import { getAllianceColorClasses } from '@/lib/match-utils';
import { type ScoreControl, splitScoreTypes } from '@/lib/score-controls';
import { countScores } from '@/lib/score-count';
import { type RefereeRole, type ScoreTarget, type ScoreType } from '@/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

export const SETUP_STEP = 'Pre-Match Setup';

function readStep(key: string | null): number {
    try {
        return key ? Number(window.sessionStorage.getItem(key) ?? 0) || 0 : 0;
    } catch {
        return 0;
    }
}

function storeStep(key: string, index: number): void {
    try {
        window.sessionStorage.setItem(key, String(index));
    } catch {
        return;
    }
}

export interface ScoringGroup {
    /** Score types tapped with − / +. */
    alliance: ScoreType[];
    team: ScoreType[];
    /** Yes/no and "one of" score types, picked with buttons. */
    allianceControls: ScoreControl[];
    teamControls: ScoreControl[];
}

/**
 * State and actions of a referee tablet. The tablet sits in one seat, like
 * FTC Live: an alliance colour and the scoring or penalty referee. It only
 * shows the score types that referee enters, for that alliance.
 */
export function useScoringPage({ role, allianceColor: seatColor }: { role: RefereeRole; allianceColor: string | null }) {
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const setScoreCount = useSetScoreCount();
    const setAllianceSubmitted = useSetAllianceSubmitted();
    const setTeamReady = useSetTeamReady();

    const [refereeField] = useRefereeField();
    const { data: matches = [] } = useMatches();
    const { activeMatch } = useActiveMatchTimer({ field: refereeField });
    const { data: loadedMatch } = useLoadedMatch(5000);
    const waitingMatch =
        loadedMatch && loadedMatch.status === 'upcoming' && (!refereeField || loadedMatch.field === refereeField) ? loadedMatch : null;
    const followMatch = activeMatch ?? waitingMatch;
    const { data: match, isLoading } = useMatch(selectedMatchId, selectedMatchId === waitingMatch?.id ? 2000 : 15000);
    const { data: allScoreTypes = [] } = useScoreTypes();
    const scoreTypes = useMemo(() => allScoreTypes.filter((st) => (st.referee ?? 'scoring') === role), [allScoreTypes, role]);

    const selectableMatches = useMemo(
        () => [
            ...matches.filter((m) => m.status === 'ongoing' && (!refereeField || m.field === refereeField)),
            ...(waitingMatch && !matches.some((m) => m.id === waitingMatch.id && m.status === 'ongoing') ? [waitingMatch] : []),
        ],
        [matches, refereeField, waitingMatch],
    );

    // Moving the tablet to another field drops the match it was scoring.
    const [scoringField, setScoringField] = useState(refereeField);
    if (scoringField !== refereeField) {
        setScoringField(refereeField);
        setSelectedMatchId(null);
    }

    useEffect(() => {
        if (followMatch && !selectedMatchId) {
            setSelectedMatchId(followMatch.id);
        }
    }, [followMatch, selectedMatchId]);

    const selectedMatchFinished = !!match && (match.status === 'completed' || match.status === 'cancelled');
    useEffect(() => {
        if (selectedMatchFinished && followMatch?.id !== selectedMatchId) {
            setSelectedMatchId(followMatch?.id ?? null);
        }
    }, [selectedMatchFinished, followMatch, selectedMatchId]);

    const selectedAlliance = match?.match_alliances.find((ma) => ma.alliance.color === seatColor);
    const selectedAllianceId = selectedAlliance?.alliance.id ?? null;
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

    const opponentAllianceId = alliances.find((alliance) => alliance && alliance.id !== selectedAllianceId)?.id;

    /**
     * Where a tap lands: a foul whose points go to the opponent is entered by
     * this alliance's penalty referee but recorded on the other alliance.
     */
    const resolveTarget = useCallback(
        (scoreType: ScoreType | undefined, target: ScoreTarget): ScoreTarget =>
            scoreType?.awarded_to === 'opponent' && target.allianceId && opponentAllianceId ? { allianceId: opponentAllianceId } : target,
        [opponentAllianceId],
    );

    const getAllianceScoreTypeCount = useCallback(
        (scoreTypeId: number) =>
            selectedAllianceId
                ? countScores(
                      match,
                      scoreTypeId,
                      resolveTarget(
                          scoreTypes.find((st) => st.id === scoreTypeId),
                          { allianceId: selectedAllianceId },
                      ),
                  )
                : 0,
        [match, selectedAllianceId, scoreTypes, resolveTarget],
    );

    const getTeamScoreTypeCount = useCallback((scoreTypeId: number, teamId: number) => countScores(match, scoreTypeId, { teamId }), [match]);

    /** Sends the new absolute count, one more or one less than shown. */
    const changeCount = useCallback(
        (scoreTypeId: number, target: ScoreTarget, delta: 1 | -1) => {
            const scoreType = scoreTypes.find((st) => st.id === scoreTypeId);
            if (!match || match.status !== 'ongoing' || !scoreType || (!target.teamId && !target.allianceId)) return;
            const landsOn = resolveTarget(scoreType, target.teamId ? { teamId: target.teamId } : { allianceId: target.allianceId });
            const current = countScores(match, scoreTypeId, landsOn);
            if (current + delta < 0) return;
            setScoreCount.mutate({ match, scoreType, target: landsOn, count: current + delta });
        },
        [match, scoreTypes, setScoreCount, resolveTarget],
    );

    const handleAddScore = useCallback((scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, 1), [changeCount]);
    const handleRemoveScore = useCallback((scoreTypeId: number, target: ScoreTarget) => changeCount(scoreTypeId, target, -1), [changeCount]);

    const submission = match?.submissions?.find((entry) => entry.alliance_id === selectedAllianceId && (entry.role ?? 'scoring') === role) ?? null;

    const setSubmitted = useCallback(
        (submitted: boolean) => {
            if (!match || !selectedAllianceId) return;
            if (submitted) {
                unsyncedCountsFor(match.id).forEach((variables) => setScoreCount.mutate(variables));
            }
            setAllianceSubmitted.mutate({ matchId: match.id, allianceId: selectedAllianceId, role, submitted });
        },
        [match, selectedAllianceId, role, setAllianceSubmitted, setScoreCount],
    );

    const unsyncedCount = useUnsyncedCount(match?.id);

    const groupSteps = sortedGroups
        .filter(([, group]) => group.alliance.length + group.team.length + group.allianceControls.length + group.teamControls.length > 0)
        .map(([name]) => (name === 'ungrouped' ? 'Scores' : name));
    const steps = [...(role === 'scoring' ? [SETUP_STEP] : []), ...(groupSteps.length > 1 ? groupSteps : [])];
    const stepKey = match && seatColor ? `referee-step:${match.id}:${seatColor}:${role}` : null;
    const [savedStep, setSavedStep] = useState<{ key: string | null; index: number }>({ key: null, index: 0 });
    const stepIndex = savedStep.key === stepKey ? savedStep.index : readStep(stepKey);
    const step = submission ? 'Submitted' : stepIndex >= steps.length ? 'Review' : steps[stepIndex];

    const goToStep = useCallback(
        (index: number) => {
            if (stepKey) {
                storeStep(stepKey, index);
                setSavedStep({ key: stepKey, index });
            }
        },
        [stepKey],
    );

    const markTeamReady = useCallback(
        (teamId: number, ready: boolean) => match && setTeamReady.mutate({ matchId: match.id, teamId, ready }),
        [match, setTeamReady],
    );

    const isMatchOpen = !!match && (match.status === 'upcoming' || match.status === 'ongoing');
    const sharingSeatWith = useRefereeSeat(isMatchOpen ? match.id : null, selectedAllianceId, role, step);

    /** A submitted alliance is locked on the tablet until its referee reopens it, and a finished match is locked for good. */
    const isPending = !!match && (match.status !== 'ongoing' || submission !== null);

    return {
        selectedAllianceId,
        selectedMatchId,
        setSelectedMatchId,
        match,
        isLoading,
        selectableMatches,
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
        role,
        /** What this tablet submits, e.g. "Blue alliance penalties". */
        seatLabel: `${allianceColor.charAt(0).toUpperCase()}${allianceColor.slice(1)} alliance ${role === 'penalty' ? 'penalties' : 'scores'}`,
        submission,
        setSubmitted,
        isSubmitPending: setAllianceSubmitted.isPending,
        submitError: setAllianceSubmitted.error,
        sharingSeatWith,
        isPending,
        steps,
        stepIndex,
        step,
        goToStep,
        groupSteps,
        markTeamReady,
        isReadyPending: setTeamReady.isPending,
        /** Score counts that never reached the server; submitting resends them first. */
        unsyncedCount,
    };
}
