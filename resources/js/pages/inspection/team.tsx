import InputError from '@/components/input-error';
import { InspectionStatusBadge } from '@/components/inspection-status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type InspectionStatus } from '@/lib/inspection-utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';

interface TeamInspectionProps extends SharedData {
    team: { id: number; number: number | string; name: string | null; organization: string | null; city: string | null };
    checklist: string[];
    inspection: { status: InspectionStatus; checked: string[]; notes: string | null; updated_by: string | null; updated_at: string | null };
}

/**
 * One team's inspection checklist, sized for an inspector's phone.
 */
export default function TeamInspection() {
    const { event, team, checklist, inspection } = usePage<TeamInspectionProps>().props;
    const base = `/event/${event?.code}`;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inspection', href: '/inspection' },
        { title: `Team ${team.number}`, href: `/inspection/${team.id}` },
    ];
    const form = useForm({
        checked: inspection.checked.filter((item) => checklist.includes(item)),
        notes: inspection.notes ?? '',
        status: inspection.status,
    });
    const allChecked = checklist.every((item) => form.data.checked.includes(item));

    const toggle = (item: string, isChecked: boolean) =>
        form.setData('checked', isChecked ? [...form.data.checked, item] : form.data.checked.filter((checkedItem) => checkedItem !== item));

    const save = (status: InspectionStatus) => {
        form.transform((data) => ({ ...data, status, notes: data.notes.trim() || null }));
        form.put(`${base}/inspection/${team.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Inspect ${team.number}`} />

            <div className="mx-auto max-w-2xl space-y-5 p-4">
                <Link href={`${base}/inspection`} className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                    <ArrowLeft className="size-4" /> All teams
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold">
                            <span className="font-mono">{team.number}</span> {team.name}
                        </h1>
                        {(team.organization || team.city) && (
                            <p className="text-muted-foreground">{[team.organization, team.city].filter(Boolean).join(' · ')}</p>
                        )}
                    </div>
                    <InspectionStatusBadge status={inspection.status} className="text-sm" />
                </div>

                {inspection.updated_by && inspection.updated_at && (
                    <p className="text-muted-foreground text-sm">
                        Last saved by {inspection.updated_by} at {new Date(inspection.updated_at).toLocaleTimeString()}
                    </p>
                )}

                <ul className="divide-y rounded-lg border">
                    {checklist.map((item, index) => (
                        <li key={item}>
                            <Label htmlFor={`item-${index}`} className="flex cursor-pointer items-center gap-3 px-4 py-3.5 text-base font-normal">
                                <Checkbox
                                    id={`item-${index}`}
                                    className="size-6"
                                    checked={form.data.checked.includes(item)}
                                    onCheckedChange={(checked) => toggle(item, checked === true)}
                                />
                                {item}
                            </Label>
                        </li>
                    ))}
                </ul>
                <p className="text-muted-foreground text-sm">
                    {form.data.checked.length} of {checklist.length} ticked
                </p>

                <div className="grid gap-1.5">
                    <Label htmlFor="notes">Notes for the team</Label>
                    <textarea
                        id="notes"
                        className="border-input bg-background min-h-24 w-full rounded-md border p-3 text-sm"
                        placeholder="What needs fixing, or anything to remember"
                        value={form.data.notes}
                        onChange={(changeEvent) => form.setData('notes', changeEvent.target.value)}
                    />
                    <InputError message={form.errors.notes} />
                </div>

                <InputError message={form.errors.status} />

                <div className="grid gap-2 sm:grid-cols-3">
                    <Button
                        size="lg"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        disabled={form.processing || !allChecked}
                        onClick={() => save('passed')}
                    >
                        Pass
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="border-amber-500 text-amber-700 dark:text-amber-400"
                        disabled={form.processing}
                        onClick={() => save('incomplete')}
                    >
                        Incomplete
                    </Button>
                    <Button size="lg" variant="secondary" disabled={form.processing} onClick={() => save('in_progress')}>
                        Save progress
                    </Button>
                </div>
                {inspection.status !== 'not_started' && (
                    <button
                        type="button"
                        className="text-muted-foreground text-sm underline"
                        disabled={form.processing}
                        onClick={() => save('not_started')}
                    >
                        Reset to not started
                    </button>
                )}
            </div>
        </AppLayout>
    );
}
