import { type CompetitionMatch, type MatchPhase } from '@/types';

/**
 * Formats seconds as "M:SS"
 */
export function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Returns phase display label
 */
export function getPhaseLabel(phase: MatchPhase): string {
    switch (phase) {
        case 'autonomous':
            return 'AUTONOMOUS';
        case 'transition':
            return 'TRANSITION';
        case 'teleop':
            return 'TELEOP';
        case 'endgame':
            return 'ENDGAME';
        case 'post-match':
            return 'MATCH OVER';
        default:
            return 'PRE-MATCH';
    }
}

/**
 * Returns Tailwind color classes for each phase
 */
export function getPhaseColors(phase: MatchPhase): { text: string; bg: string } {
    switch (phase) {
        case 'autonomous':
            return { text: 'text-yellow-400', bg: 'bg-yellow-400' };
        case 'transition':
            return { text: 'text-orange-400', bg: 'bg-orange-400' };
        case 'teleop':
            return { text: 'text-green-400', bg: 'bg-green-400' };
        case 'endgame':
            return { text: 'text-red-400', bg: 'bg-red-400' };
        case 'post-match':
            return { text: 'text-white/50', bg: 'bg-white/50' };
        default:
            return { text: 'text-white/70', bg: 'bg-white/30' };
    }
}

/**
 * Calculates alliance total score from match data
 */
export function getAllianceScore(match: CompetitionMatch, color: string): number {
    if (!match.match_alliances || match.match_alliances.length === 0) {
        return 0;
    }

    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance?.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + (ma.score || 0), 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.score_type?.points || 0), 0);

    const total = teamScore + allianceWideScore;

    return total;
}
