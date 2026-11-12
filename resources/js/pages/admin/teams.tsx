import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from '@/hooks/use-teams';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Team } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { CircleX, Save, SquarePen } from 'lucide-react';
import { type FormEvent, useState } from 'react';

type FieldErrors = Record<string, string[]>;

interface TeamDraft {
    number: string;
    name: string;
    organization: string;
    city: string;
    rookieYear: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Teams', href: '/admin/teams' },
];

const rowInput = `${bs.formControl} disabled:bg-[#e9ecef]`;
const iconButton = cn(bs.btnSecondary, bs.btnSm);

function draftOf(team: Team): TeamDraft {
    return {
        number: String(team.number),
        name: team.name,
        organization: team.organization ?? '',
        city: team.city ?? '',
        rookieYear: team.rookie_year ? String(team.rookie_year) : '',
    };
}

function validationErrors(error: unknown): FieldErrors {
    return (error as { response?: { data?: { errors?: FieldErrors } } }).response?.data?.errors ?? {};
}

function firstError(errors: FieldErrors): string | undefined {
    return Object.values(errors)[0]?.[0];
}

function AddTeamForm() {
    const [number, setNumber] = useState('');
    const [errors, setErrors] = useState<FieldErrors>({});
    const createTeam = useCreateTeam();

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        setErrors({});

        const teamNumber = parseInt(number, 10);

        if (Number.isNaN(teamNumber)) {
            return;
        }

        createTeam.mutate(
            { number: teamNumber, name: `Team ${teamNumber}`, organization: null, city: null, rookie_year: null },
            {
                onSuccess: () => setNumber(''),
                onError: (error: unknown) => setErrors(validationErrors(error)),
            },
        );
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="inline-flex w-[25em] max-w-full">
                <label htmlFor="teamIn" className="mr-2 py-[7px] whitespace-nowrap">
                    Team Number to Add:
                </label>
                <div className="flex w-full">
                    <input
                        id="teamIn"
                        type="text"
                        inputMode="numeric"
                        className={cn(bs.formControl, 'rounded-r-none')}
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                    />
                    <button type="submit" className={cn(bs.btnSecondary, '-ml-px rounded-l-none')} disabled={createTeam.isPending}>
                        Add
                    </button>
                </div>
            </div>
            {firstError(errors) && <div className={bs.textDanger}>{firstError(errors)}</div>}
        </form>
    );
}

function RemoveTeamDialog({ team, onClose }: { team: Team; onClose: () => void }) {
    const deleteTeam = useDeleteTeam();

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="top-7 translate-y-0 gap-0 rounded-lg border-black/20 bg-white p-0 text-base text-[#212529] sm:max-w-[500px]">
                <div className="border-b border-[#dee2e6] p-4">
                    <DialogTitle className="text-xl leading-normal font-medium">Remove Team</DialogTitle>
                </div>
                <DialogDescription className="p-4 text-base text-[#212529]">
                    Are you sure you want to remove team {team.number} "{team.name}"? This action cannot be undone.
                </DialogDescription>
                <div className="flex justify-end gap-2 border-t border-[#dee2e6] p-3">
                    <button type="button" className={bs.btnSecondary} onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className={bs.btnDanger}
                        disabled={deleteTeam.isPending}
                        onClick={() => deleteTeam.mutate(team.id, { onSuccess: onClose })}
                    >
                        Remove
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function TeamRow({ team }: { team: Team }) {
    const [draft, setDraft] = useState<TeamDraft | null>(null);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [removing, setRemoving] = useState(false);
    const updateTeam = useUpdateTeam();
    const values = draft ?? draftOf(team);
    const editing = draft !== null;

    const change = (field: keyof TeamDraft, value: string) => setDraft({ ...values, [field]: value });

    const save = () => {
        setErrors({});
        updateTeam.mutate(
            {
                id: team.id,
                data: {
                    number: parseInt(values.number, 10),
                    name: values.name,
                    organization: values.organization.trim() || null,
                    city: values.city.trim() || null,
                    rookie_year: values.rookieYear ? parseInt(values.rookieYear, 10) : null,
                },
            },
            {
                onSuccess: () => setDraft(null),
                onError: (error: unknown) => setErrors(validationErrors(error)),
            },
        );
    };

    return (
        <tr>
            <th scope="row">
                <input
                    className={rowInput}
                    type="text"
                    aria-label="Number"
                    value={values.number}
                    disabled={!editing}
                    onChange={(e) => change('number', e.target.value)}
                />
                {firstError(errors) && <div className={`font-normal ${bs.textDanger}`}>{firstError(errors)}</div>}
            </th>
            <td>
                <input
                    className={rowInput}
                    type="text"
                    aria-label="Short Name"
                    value={values.name}
                    disabled={!editing}
                    onChange={(e) => change('name', e.target.value)}
                />
            </td>
            <td>
                <input
                    className={rowInput}
                    type="text"
                    aria-label="Affiliation"
                    value={values.organization}
                    disabled={!editing}
                    onChange={(e) => change('organization', e.target.value)}
                />
            </td>
            <td>
                <input
                    className={rowInput}
                    type="text"
                    aria-label="City"
                    value={values.city}
                    disabled={!editing}
                    onChange={(e) => change('city', e.target.value)}
                />
            </td>
            <td>
                <input
                    className={rowInput}
                    type="text"
                    inputMode="numeric"
                    aria-label="Rookie Year"
                    value={values.rookieYear}
                    disabled={!editing}
                    onChange={(e) => change('rookieYear', e.target.value)}
                />
            </td>
            <td className="whitespace-nowrap">
                {editing ? (
                    <button type="button" className={iconButton} title="Save" disabled={updateTeam.isPending} onClick={save}>
                        <Save className="inline size-4" />
                    </button>
                ) : (
                    <button type="button" className={iconButton} title="Edit" onClick={() => setDraft(draftOf(team))}>
                        <SquarePen className="inline size-4" />
                    </button>
                )}
                &nbsp;&nbsp;
                <button type="button" className={iconButton} title="Remove" onClick={() => setRemoving(true)}>
                    <CircleX className="inline size-4" />
                </button>
                {removing && <RemoveTeamDialog team={team} onClose={() => setRemoving(false)} />}
            </td>
        </tr>
    );
}

export default function TeamsPage() {
    const { event } = usePage<SharedData>().props;
    const { data: teams = [] } = useTeams();
    const dashboardHref = event ? `/event/${event.code}/dashboard` : '/events';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams" />

            <div>
                <div className={`${bs.h2} pointer-events-none -mt-8 text-center`}>Adding to event '{event?.code}'</div>
                <div className="flow-root border border-[#ccc] bg-[#f1f1f1]">
                    <span className="float-left bg-[#ccc] px-4 py-3.5 text-[17px]">Add Individually</span>
                    <Link href={dashboardHref} className={`${bs.btnPrimary} float-right m-1.5 no-underline`}>
                        Done
                    </Link>
                </div>
                <div className="border border-t-0 border-[#ccc] px-3 py-1.5">
                    <AddTeamForm />
                    <table
                        className={cn(
                            bs.table,
                            bs.tableStriped,
                            'mt-2 table-fixed break-words [&_td]:p-0.5 [&_th]:p-0.5 [&_thead_th]:text-left [&_thead_th]:text-[0.8rem]',
                        )}
                    >
                        <colgroup>
                            <col className="w-[12.5%]" />
                            <col className="w-[20.83%]" />
                            <col className="w-[25%]" />
                            <col className="w-[16.67%]" />
                            <col className="w-[16.67%]" />
                            <col className="w-[8.33%]" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th scope="col">Number</th>
                                <th scope="col">Short Name</th>
                                <th scope="col">Affiliation</th>
                                <th scope="col">City</th>
                                <th scope="col">Rookie Year</th>
                                <th scope="col">Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.map((team) => (
                                <TeamRow key={team.id} team={team} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
