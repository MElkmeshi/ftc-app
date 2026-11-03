import { type CompetitionMatch, type Score, type ScoreTarget, type ScoreType } from '@/types';

let nextTemporaryId = -1;

const isForTarget = (score: Score, target: ScoreTarget) =>
    target.teamId ? score.team_id === target.teamId : !score.team_id && score.alliance_id === target.allianceId;

/** How many times a score type is scored for one robot or alliance. */
export function countScores(match: CompetitionMatch | undefined, scoreTypeId: number, target: ScoreTarget): number {
    return (match?.scores ?? []).filter((score) => score.score_type_id === scoreTypeId && isForTarget(score, target)).length;
}

/**
 * The match as it will be once the server has set a score type's count for
 * one robot or alliance, following the same rules as the server: a yes/no
 * score type counts at most once and a "one of" option replaces the others
 * of its set. Shown at once on the tablet while the request is on its way.
 */
export function applyScoreCount(
    match: CompetitionMatch,
    scoreType: ScoreType,
    scoreTypes: ScoreType[],
    target: ScoreTarget,
    count: number,
): CompetitionMatch {
    const scores = match.scores ?? [];
    const wanted = scoreType.kind === 'count' ? Math.max(0, count) : Math.min(Math.max(0, count), 1);
    const existing = scores
        .filter((score) => score.score_type_id === scoreType.id && isForTarget(score, target))
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);

    if (wanted === existing.length) {
        return match;
    }

    let removed: Score[] = [];
    let added: Score[] = [];

    if (wanted < existing.length) {
        removed = existing.slice(0, existing.length - wanted);
    } else {
        if (scoreType.kind === 'choice' && scoreType.choice_set) {
            const siblings = new Set(
                scoreTypes
                    .filter((st) => st.kind === 'choice' && st.choice_set === scoreType.choice_set && st.id !== scoreType.id)
                    .map((st) => st.id),
            );
            removed = scores.filter((score) => score.score_type_id !== null && siblings.has(score.score_type_id) && isForTarget(score, target));
        }

        const allianceId = target.allianceId ?? match.match_alliances.find((ma) => ma.team.id === target.teamId)?.alliance.id ?? null;
        added = Array.from({ length: wanted - existing.length }, () => ({
            id: nextTemporaryId--,
            match_id: match.id,
            team_id: target.teamId ?? null,
            alliance_id: allianceId,
            points: scoreType.points,
            score_type_id: scoreType.id,
            score_type: scoreType,
            created_at: new Date().toISOString(),
        }));
    }

    const removedIds = new Set(removed.map((score) => score.id));
    const pointsFor = (list: Score[]) => list.reduce((sum, score) => sum + (score.points ?? score.score_type?.points ?? 0), 0);
    const teamDelta = target.teamId ? pointsFor(added) - pointsFor(removed) : 0;

    return {
        ...match,
        scores: [...scores.filter((score) => !removedIds.has(score.id)), ...added],
        match_alliances: teamDelta
            ? match.match_alliances.map((ma) => (ma.team.id === target.teamId ? { ...ma, score: ma.score + teamDelta } : ma))
            : match.match_alliances,
    };
}
