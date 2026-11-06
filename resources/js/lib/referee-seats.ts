import { type CompetitionMatch, type RefereeRole } from '@/types';

export const findSubmission = (match: CompetitionMatch, allianceId: number, role: RefereeRole) =>
    match.submissions?.find((entry) => entry.alliance_id === allianceId && (entry.role ?? 'scoring') === role);

export const seatsOf = (match: CompetitionMatch, allianceId: number): RefereeRole[] =>
    match.referee_seats?.some((seat) => seat.alliance_id === allianceId && seat.role === 'penalty') ? ['scoring', 'penalty'] : ['scoring'];
