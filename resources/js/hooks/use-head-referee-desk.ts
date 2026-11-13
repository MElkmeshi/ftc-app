import { useApi } from '@/hooks/use-api';
import { apiScope } from '@/lib/event';
import { type HeadRefereeDesk, type MeetingType } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export function useHeadRefereeDesk() {
    const api = useApi();
    const queryClient = useQueryClient();
    const queryKey = ['head-referee-desk', apiScope()];
    const { data } = useQuery({ queryKey, queryFn: () => api.getHeadRefereeDesk(), refetchInterval: 3000 });
    const store = (desk: HeadRefereeDesk) => queryClient.setQueryData(queryKey, desk);
    const warning = useMutation({ mutationFn: (active: boolean) => api.setTwoMinuteWarning(active), onSuccess: store });
    const meeting = useMutation({
        mutationFn: ({ type, text }: { type: MeetingType; text: string }) => api.setMeetingNotes(type, text),
        onSuccess: store,
    });

    return {
        warningStartedAt: data?.warning_started_at ? new Date(data.warning_started_at).getTime() : null,
        meetingNotes: data?.meeting_notes ?? {},
        setWarning: warning.mutate,
        saveMeetingNotes: meeting.mutateAsync,
        savingMeetingNotes: meeting.isPending,
    };
}
