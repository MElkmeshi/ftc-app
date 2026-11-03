import { type CompetitionMatch, type Group, type MatchAlliance, type MatchPhase } from '@/types';

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
        .reduce((sum, s) => sum + (s.points ?? s.score_type?.points ?? 0), 0);

    const total = teamScore + allianceWideScore;

    return total;
}

export interface AllianceColorClasses {
    bg: string;
    bgHover: string;
    border: string;
    text: string;
    bgLight: string;
}

export function getAllianceColorClasses(color: string): AllianceColorClasses {
    if (color === 'red') {
        return {
            bg: 'bg-red-600',
            bgHover: 'hover:bg-red-700',
            border: 'border-red-500',
            text: 'text-red-600',
            bgLight: 'bg-red-50 dark:bg-red-950',
        };
    }
    if (color === 'blue') {
        return {
            bg: 'bg-blue-600',
            bgHover: 'hover:bg-blue-700',
            border: 'border-blue-500',
            text: 'text-blue-600',
            bgLight: 'bg-blue-50 dark:bg-blue-950',
        };
    }
    return {
        bg: 'bg-gray-600',
        bgHover: 'hover:bg-gray-700',
        border: 'border-gray-500',
        text: 'text-gray-600',
        bgLight: 'bg-gray-50 dark:bg-gray-950',
    };
}

export function determineWinner(match: CompetitionMatch): 'red' | 'blue' | 'tie' {
    const red = getAllianceScore(match, 'red');
    const blue = getAllianceScore(match, 'blue');
    return red > blue ? 'red' : blue > red ? 'blue' : 'tie';
}

export function getAllianceMembers(match: CompetitionMatch, color: string): MatchAlliance[] {
    return match.match_alliances?.filter((ma) => ma.alliance.color === color) ?? [];
}

export interface ScoreBreakdownLine {
    label: string;
    points: number;
}

/**
 * Splits an alliance's total into its score groups (e.g. "Autonomous",
 * "Teleop"), in the groups' display order, for the results screen. Any
 * difference left by a manual score correction is shown as "Adjustment" so the
 * lines always add up to the total.
 */
export function getAllianceBreakdown(match: CompetitionMatch, color: string, groups: Group[]): ScoreBreakdownLine[] {
    const allianceIds = new Set(getAllianceMembers(match, color).map((ma) => ma.alliance.id));
    const groupNames = new Map(groups.map((group) => [group.id, group.name]));
    const groupOrder = new Map(groups.map((group) => [group.id, group.display_order]));
    const totals = new Map<number | null, number>();

    for (const score of match.scores ?? []) {
        if (!allianceIds.has(score.alliance_id ?? -1)) {
            continue;
        }

        const groupId = score.score_type?.group_id ?? null;
        totals.set(groupId, (totals.get(groupId) ?? 0) + (score.points ?? score.score_type?.points ?? 0));
    }

    const lines = [...totals.entries()]
        .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : (groupOrder.get(a) ?? 0) - (groupOrder.get(b) ?? 0)))
        .map(([groupId, points]) => ({ label: groupId === null ? 'Other' : (groupNames.get(groupId) ?? 'Other'), points }));

    const adjustment = getAllianceScore(match, color) - lines.reduce((sum, line) => sum + line.points, 0);

    return adjustment === 0 ? lines : [...lines, { label: 'Adjustment', points: adjustment }];
}

/** "Qualification 12", "Semifinal 1 · Match 2", ... */
export function getMatchTitle(match: Pick<CompetitionMatch, 'number' | 'type' | 'round'>): string {
    if (match.type !== 'elimination') {
        return `Qualification ${match.number}`;
    }

    const round = (match.round ?? 'Playoff')
        .replace(/^tiebreaker_/, 'Tiebreaker ')
        .replace(/_(\d)$/, ' $1')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return `${round} · Match ${match.number}`;
}
