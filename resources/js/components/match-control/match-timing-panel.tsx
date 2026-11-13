import { useApi } from '@/hooks/use-api';
import { useMatchControlSettings } from '@/hooks/use-match-control-settings';
import type { MatchTimingConfig } from '@/hooks/use-match-timer';
import { getApiErrorMessage } from '@/lib/api-error';
import { apiScope, eventUrl } from '@/lib/event';
import { type CompetitionMatch, type MatchControlSettings } from '@/types';
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

function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (checked: boolean) => void; hint?: string }) {
    return (
        <label className="flex w-fit items-center gap-2" title={hint}>
            <input type="checkbox" className="size-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            {label}
        </label>
    );
}

export function MatchTimingPanel({
    phase,
    phases,
    hasRunningMatch,
}: {
    phase: CompetitionMatch['type'] | 'test';
    phases: (CompetitionMatch['type'] | 'test')[];
    hasRunningMatch: boolean;
}) {
    const api = useApi();
    const { data } = useQuery({ queryKey: ['competition-settings', apiScope()], queryFn: () => api.getCompetitionSettings() });
    const { settings, update, setTestMode, changingTestMode, error } = useMatchControlSettings();
    const saveError = getApiErrorMessage(error);

    return (
        <div className="text-lg">
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Active Match Schedule</legend>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className={greenButtonClass}
                        disabled={changingTestMode || hasRunningMatch}
                        title="Throwaway matches for trying the timer, displays and tablets. They are deleted when you exit."
                        onClick={() => setTestMode(!settings.test_mode)}
                    >
                        {settings.test_mode ? 'Exit Test Mode' : 'Enter Test Mode'}
                    </button>
                    <button
                        type="button"
                        className={greenButtonClass}
                        disabled={phase !== 'practice' || !phases.includes('qualification')}
                        onClick={() => update({ active_phase: 'qualification' })}
                    >
                        Advance to Quals
                    </button>
                    <button
                        type="button"
                        className={greenButtonClass}
                        disabled={phase === 'practice' || !phases.includes('practice')}
                        onClick={() => update({ active_phase: 'practice' })}
                    >
                        Return to Practice
                    </button>
                </div>
            </fieldset>
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Timing Controls</legend>
                <Switch
                    label="Enable Recorded Countdown"
                    hint="Plays the 3-2-1 countdown before the match starts"
                    checked={settings.recorded_countdown}
                    onChange={(recorded_countdown) => update({ recorded_countdown })}
                />
                <div className="mt-2">{data ? <TimingForm key={JSON.stringify(data.timing)} timing={data.timing} /> : <p>Loading…</p>}</div>
            </fieldset>
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Live Scoring</legend>
                <Switch
                    label="Use Live Scoring"
                    hint="When off, a match can be committed without waiting for any tablet; enter its scores from the schedule"
                    checked={settings.live_scoring}
                    onChange={(live_scoring) => update({ live_scoring })}
                />
                <Switch
                    label="Require Scorer Init Submit Before Match Start"
                    hint="Start Match stays locked until every team's pre-match setup is submitted"
                    checked={settings.require_ready}
                    onChange={(require_ready) => update({ require_ready })}
                />
                <Switch
                    label="Enable Referee Tablets"
                    hint="When off, a match is committed without waiting for the penalty referees' tablets"
                    checked={settings.referee_tablets}
                    onChange={(referee_tablets) => update({ referee_tablets })}
                />
                <label className="flex w-fit items-center gap-2" title="Allows basic match control from the Head Referee page.">
                    Enable External Match Control
                    <select
                        className="rounded border border-white bg-white px-1 text-black"
                        value={settings.hr_control}
                        onChange={(e) => update({ hr_control: e.target.value as MatchControlSettings['hr_control'] })}
                    >
                        <option value="none">None</option>
                        <option value="start">Match Start</option>
                        <option value="full">Full Control</option>
                    </select>
                </label>
            </fieldset>
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Control Page Appearance</legend>
                <Switch
                    label="Flip Alliances (Red on Left)"
                    checked={settings.flip_alliances}
                    onChange={(flip_alliances) => update({ flip_alliances })}
                />
            </fieldset>
            {saveError && <p className="m-1 w-fit rounded bg-[#f8d7da] px-3 py-1 text-[#842029]">{saveError}</p>}
            <fieldset className={fieldsetClass}>
                <legend className="px-1">Game Setup</legend>
                <Link href={eventUrl('/admin/competition-settings?from=match-control')} className={`${greenButtonClass} inline-block`}>
                    Logo, Background &amp; Rankings
                </Link>
            </fieldset>
        </div>
    );
}
