import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { type InspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

interface TeamInspectionProps extends SharedData {
    team: { id: number; number: number | string; name: string | null; organization: string | null; city: string | null };
    checklist: string[];
    inspection: { status: InspectionStatus; checked: string[]; notes: string | null; updated_by: string | null; updated_at: string | null };
}

const inspectionButton =
    'inline-block cursor-pointer rounded-md border px-3 py-1.5 text-center align-middle text-base leading-normal font-normal text-black select-none disabled:pointer-events-none disabled:opacity-65';

export default function TeamInspection() {
    const { event, team, checklist, inspection } = usePage<TeamInspectionProps>().props;
    const base = `/event/${event?.code}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Team Select', href: '/inspection' },
        { title: `Team ${team.number}`, href: `/inspection/${team.id}` },
    ];
    const form = useForm({
        checked: inspection.checked.filter((item) => checklist.includes(item)),
        notes: inspection.notes ?? '',
        status: inspection.status,
    });
    const [highlightMissing, setHighlightMissing] = useState(false);
    const [showUnchecked, setShowUnchecked] = useState(false);
    const uncheckedCount = checklist.filter((item) => !form.data.checked.includes(item)).length;

    const toggle = (item: string) =>
        form.setData(
            'checked',
            form.data.checked.includes(item) ? form.data.checked.filter((checkedItem) => checkedItem !== item) : [...form.data.checked, item],
        );

    const save = (status: InspectionStatus) => {
        form.transform((data) => ({ ...data, status, notes: data.notes.trim() || null }));
        form.put(`${base}/inspection/${team.id}`);
    };

    const pass = () => {
        if (uncheckedCount > 0) {
            setShowUnchecked(true);

            return;
        }

        save('passed');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inspect ${team.number}`} />

            <div>
                <h2 className={bs.h2}>
                    <b>Inspection Checklist</b>
                </h2>
                <div className="flex w-full justify-between">
                    <div className="w-3/5">
                        <h3 className={bs.h3}>
                            <b>Team Number: {team.number}</b>
                        </h3>
                    </div>
                    <div className="w-2/5 text-right">
                        <button type="button" className={bs.btnInfo} disabled={form.processing} onClick={() => save('in_progress')}>
                            Mark In Progress
                        </button>{' '}
                        <button type="button" className={bs.btnInfo} onClick={() => setHighlightMissing(true)}>
                            Highlight Missing
                        </button>
                    </div>
                </div>
                <table className="w-full border-collapse [&_td]:border [&_td]:border-[gray] [&_th]:border [&_th]:border-[gray]">
                    <tbody>
                        <tr className="bg-[#EE7C36] text-center font-[Tahoma,Arial,sans-serif] text-white">
                            <th className="max-w-[100px] min-w-[40px]">✔</th>
                            <th>Inspection Checklist</th>
                        </tr>
                        {checklist.map((item, index) => {
                            const isChecked = form.data.checked.includes(item);

                            return (
                                <tr key={item} className="h-[30px]">
                                    <td
                                        className={cn(
                                            'max-w-[100px] min-w-[40px] p-0 text-center font-[Arial] text-sm leading-[14px]',
                                            highlightMissing && !isChecked && 'bg-[#00FFFF]',
                                        )}
                                    >
                                        <button
                                            type="button"
                                            id={`item-${index}`}
                                            role="checkbox"
                                            aria-checked={isChecked}
                                            aria-label={item}
                                            className="block min-h-[30px] w-full cursor-pointer"
                                            onClick={() => toggle(item)}
                                        >
                                            {isChecked ? '✓' : ''}
                                        </button>
                                    </td>
                                    <td className="pt-[0.1rem] pl-[2px] font-[Arial] text-sm leading-[14px]">{item}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <br />
                <label htmlFor="notes" className="font-bold">
                    General Comments or Reason(s) for Incomplete:
                </label>
                <textarea
                    id="notes"
                    rows={4}
                    className="block w-full border border-[#767676] bg-white px-0.5"
                    value={form.data.notes}
                    onChange={(changeEvent) => form.setData('notes', changeEvent.target.value)}
                />
                <div className="text-[10px]">
                    Comments are visible to Teams. For record-keeping purposes, when a comment is no longer relevant, append "RESOLVED" instead of
                    deleting it.
                </div>
                <div className="flex justify-between">
                    <button type="button" className={bs.btnPrimary} disabled={form.processing} onClick={() => save(inspection.status)}>
                        Save Comment
                    </button>
                </div>
                <InputError message={form.errors.notes} className="text-base text-[#dc3545]" />
                <p className="mb-4">{form.isDirty ? 'Unsaved Changes' : ' '}</p>
                <div className="w-full text-center">
                    <button
                        type="button"
                        className={cn(inspectionButton, 'border-[#32cd32] bg-[#32cd32] hover:border-[#47d247] hover:bg-[#51d551]')}
                        disabled={form.processing}
                        onClick={pass}
                    >
                        Pass
                    </button>
                    <span className="inline-block w-8" />
                    <button
                        type="button"
                        className={cn(inspectionButton, 'border-[#f0e442] bg-[#f0e442] hover:border-[#f2e755] hover:bg-[#f2e85e]')}
                        disabled={form.processing}
                        onClick={() => save('incomplete')}
                    >
                        Incomplete
                    </button>
                </div>
                <br />
                <div className="w-full text-center">
                    {showUnchecked && uncheckedCount > 0 ? (
                        <span className="text-[red]">
                            {uncheckedCount} Items Unchecked!{' '}
                            <button type="button" className={bs.link} onClick={() => setHighlightMissing(true)}>
                                Show
                            </button>
                        </span>
                    ) : form.errors.status ? (
                        <span className="text-[red]">{form.errors.status}</span>
                    ) : (
                        ' '
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
