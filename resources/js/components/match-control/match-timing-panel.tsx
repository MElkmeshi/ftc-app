import { useApi } from '@/hooks/use-api';
import type { MatchTimingConfig } from '@/hooks/use-match-timer';
import { getApiErrorMessage } from '@/lib/api-error';
import { apiScope, eventUrl } from '@/lib/event';
import { Link } from '@inertiajs/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, useState } from 'react';

type TimingField = 'pre_match_countdown' | 'autonomous' | 'transition' | 'teleop' | 'endgame_warning' | 'controllers_warning_offset';

const FIELDS: { field: TimingField; label: string; max: number }[] = [
    { field: 'pre_match_countdown', label: 'Pre-Match Countdown', max: 10 },
    { field: 'autonomous', label: 'Autonomous', max: 60 },
    { field: 'transition', label: 'Transition', max: 30 },
    { field: 'teleop', label: 'Driver-Controlled', max: 300 },
    { field: 'endgame_warning', label: 'Endgame Warning', max: 60 },
    { field: 'controllers_warning_offset', label: 'Pick Up Controllers Warning', max: 10 },
];

const fieldsetClass = 'm-1 border-2 border-white px-3 pb-3';
const greenButtonClass = 'rounded-md border border-[#198754] bg-[#198754] px-3 py-1.5 text-white hover:bg-[#157347] disabled:opacity-65';

function TimingForm({ timing }: { timing: MatchTimingConfig }) {
    const api = useApi();
    const queryClient = useQueryClient();
    const [values, setValues] = useState<Record<TimingField, number>>(() => ({
        pre_match_countdown: timing.pre_match_countdown,
        autonomous: timing.autonomous,
        transition: timing.transition,
        teleop: timing.teleop,
        endgame_warning: timing.endgame_warning,
        controllers_warning_offset: timing.controllers_warning_offset,
    }));
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['competition-settings'] });
    const save = useMutation({ mutationFn: () => api.updateCompetitionSettings(values), onSuccess: refresh });
    const reset = useMutation({ mutationFn: () => api.resetCompetitionSettings(), onSuccess: refresh });
    const error = getApiErrorMessage(save.error ?? reset.error);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        save.mutate();
    };

    return (
        <form onSubmit={submit}>
            <div className="grid max-w-xl grid-cols-[auto_6rem_auto] items-center gap-x-3 gap-y-1">
                {FIELDS.map(({ field, label, max }) => (
                    <label key={field} className="contents">
                        <span>{label}</span>
                        <input
                            type="number"
                            min={0}
                            max={max}
                            required
                            className="rounded border border-white bg-white px-1 text-black"
                            value={values[field]}
                            onChange={(e) => setValues({ ...values, [field]: Number(e.target.value) })}
                        />
                        <span>seconds</span>
                    </label>
                ))}
            </div>
            {error && <p className="mt-2 w-fit rounded bg-[#f8d7da] px-3 py-1 text-[#842029]">{error}</p>}
            {save.isSuccess && !error && <p className="mt-2">Saved.</p>}
            <div className="mt-3 flex gap-2">
                <button type="submit" className={greenButtonClass} disabled={save.isPending || reset.isPending}>
                    Save Timing
                </button>
                <button
                    type="button"
                    className={greenButtonClass}
                    disabled={save.isPending || reset.isPending}
                    onClick={() => confirm('Reset the match timing to the defaults?') && reset.mutate()}
                >
                    Reset to Defaults
                </button>
            </div>
        </form>
    );
}

export function MatchTimingPanel() {
    const api = useApi();
    const { data } = useQuery({ queryKey: ['competition-settings', apiScope()], queryFn: () => api.getCompetitionSettings() });

    return (
        <div className="text-lg">
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Timing Controls</legend>
                {data ? <TimingForm key={JSON.stringify(data.timing)} timing={data.timing} /> : <p>Loading…</p>}
            </fieldset>
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Game Setup</legend>
                <Link href={eventUrl('/admin/competition-settings?from=match-control')} className={`${greenButtonClass} inline-block`}>
                    Logo, Background &amp; Rankings
                </Link>
            </fieldset>
        </div>
    );
}
