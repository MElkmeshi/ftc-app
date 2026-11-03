import { type RefereeRole } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useApi } from './use-api';

/** Identifies this open scoring page, so two tablets signed in as the same referee still count as two. */
const TABLET_ID = crypto.randomUUID();

const HEARTBEAT_MS = 5000;

/**
 * Tells the server which alliance this tablet is scoring, every few seconds,
 * and returns the names on any other tablet in the same seat (alliance and
 * scoring or penalty referee). Two tablets in one seat overwrite each other's counts, so the page warns.
 */
export function useRefereeSeat(matchId: number | null | undefined, allianceId: number | null, role: RefereeRole = 'scoring'): string[] {
    const api = useApi();

    const { data } = useQuery({
        queryKey: ['referee-seat', matchId, allianceId, role],
        queryFn: () => api.reportRefereeSeat({ tablet_id: TABLET_ID, match_id: matchId!, alliance_id: allianceId, role }),
        enabled: !!matchId,
        refetchInterval: HEARTBEAT_MS,
        refetchIntervalInBackground: true,
        gcTime: 0,
    });

    return data?.sharing_with ?? [];
}
