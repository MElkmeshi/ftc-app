import { type CompetitionMatch, type MatchAlliance } from '@/types';

export interface Standing {
    rank: number;
    wins: number;
    losses: number;
    ties: number;
    played: number;
}

export function allianceColorsOf(match: CompetitionMatch): string[] {
    return [...new Set(match.match_alliances.map((matchAlliance) => matchAlliance.alliance.color))].sort((a, b) =>
        a === 'red' ? -1 : b === 'red' ? 1 : a.localeCompare(b),
    );
}

export function membersOf(match: CompetitionMatch, color: string): MatchAlliance[] {
    return match.match_alliances.filter((matchAlliance) => matchAlliance.alliance.color === color).sort((a, b) => a.id - b.id);
}

export function describeStanding(standing: Standing | undefined): string | null {
    if (!standing) {
        return null;
    }

    return `Rank ${standing.rank} · ${standing.wins}-${standing.losses}-${standing.ties}`;
}
