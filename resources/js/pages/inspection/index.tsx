import InputError from '@/components/input-error';
import { inspectionStatusCellClass, inspectionStatusLabel, InspectionStatusLegend } from '@/components/inspection-status-badge';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { type TeamInspectionStatus } from '@/lib/inspection-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage, useProp } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inspection', href: '/inspection' }];

function ChecklistEditor({ checklist, base }: { checklist: string[]; base: string }) {
    const form = useForm({ items: checklist.join('\n') });

    form.transform((data) => ({
        items: data.items
            .split('\n')
            .map((item) => item.trim())
            .filter((item) => item !== ''),
    }));

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        form.put(`${base}/inspection/checklist`, { preserveScroll: true });
    };

    const itemError = Object.entries(form.errors as Record<string, string>).find(([key]) => key.startsWith('items'))?.[1];

    return (
        <form onSubmit={submit}>
            <label htmlFor="checklist-items" className="font-bold">
                Inspection Checklist (one item per line):
            </label>
            <textarea
                id="checklist-items"
                rows={8}
                className="w-full border border-[#767676] bg-white px-0.5"
                value={form.data.items}
                onChange={(changeEvent) => form.setData('items', changeEvent.target.value)}
            />
            <InputError message={itemError} className="text-[#dc3545]" />
            <button type="submit" className={bs.btnPrimary} disabled={form.processing}>
                Save Checklist
            </button>
            <p>{form.recentlySuccessful ? 'Saved' : ' '}</p>
        </form>
    );
}

export default function Inspection() {
    const { event, auth, checklist } = usePage<SharedData & { checklist: string[] }>().props;
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('teams');
    const base = `/event/${event?.code}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inspection" />

            <div>
                <div className="-mt-6 text-right">
                    {auth.can?.overrideInspection && (
                        <>
                            <Link href={`${base}/inspection/override`} className={bs.link}>
                                Lead Inspector Override
                            </Link>
                            <br />
                        </>
                    )}
                    <Link href={`${base}/inspection/notes`} className={bs.link}>
                        View Inspection Notes
                    </Link>
                    <br />
                </div>
                <h3 className={bs.h3}>Robot Inspection - {event?.name}</h3>
                <br />
                <InspectionStatusLegend teams={teams} />
                <div>Select a team to inspect:</div>
                <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Name</th>
                            <th>Status</th>
                            <th>Inspect</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.id}>
                                <td>{team.number}</td>
                                <td>{team.name}</td>
                                <td className={inspectionStatusCellClass(team.status)}>{inspectionStatusLabel(team.status)}</td>
                                <td>
                                    <Link href={`${base}/inspection/${team.id}`} className={bs.link}>
                                        Inspect
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {auth.user?.role === 'admin' && <ChecklistEditor checklist={checklist} base={base} />}
            </div>
        </AppLayout>
    );
}
