import { type AwardPresentation, type AwardRow, PresentAwards, winnersText } from '@/components/awards/present-awards';
import { TeamPicker } from '@/components/awards/team-picker';
import InputError from '@/components/input-error';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import { placeLabel } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Team } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';

interface AwardsProps extends SharedData {
    awards: AwardRow[];
    teams: TeamOption[];
    locked: boolean;
    presenting: AwardPresentation | null;
}

type TeamOption = Pick<Team, 'id' | 'number' | 'name'>;

interface PlaceEntry {
    teams: string[];
    recipient: string;
}

type AwardsTab = 'manage' | 'enter' | 'present';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Awards', href: '/admin/awards' }];

const TABS: { key: AwardsTab; label: string }[] = [
    { key: 'manage', label: 'Manage Awards' },
    { key: 'enter', label: 'Enter Awards' },
    { key: 'present', label: 'Present Awards' },
];

const card = 'mb-2 rounded-md border border-black/[0.175] bg-white';
const cardHeader = 'flex items-center justify-between rounded-t-md border-b border-black/[0.175] bg-black/[0.03] px-4 py-2';
const listItem = 'block w-full cursor-pointer border border-t-0 px-4 py-2 text-left first:rounded-t-md first:border-t last:rounded-b-md';
const modalContent = 'top-7 translate-y-0 gap-0 rounded-lg border-black/20 bg-white p-0 text-base text-[#212529] sm:max-w-[500px]';

function placeEntries(award: AwardRow | null): PlaceEntry[] {
    return Array.from({ length: 3 }, (_, index) => {
        const winners = award?.winners.filter((winner) => winner.place === index + 1) ?? [];

        return {
            teams: winners.flatMap((winner) => (winner.team ? [String(winner.team.number)] : [])),
            recipient: winners.find((winner) => winner.recipient)?.recipient ?? '',
        };
    });
}

function useAwardForm(award: AwardRow | null, base: string, onDone?: () => void) {
    const form = useForm({
        name: award?.name ?? '',
        description: award?.description ?? '',
        places: award?.places ?? 1,
        entries: placeEntries(award),
    });

    form.transform((data) => ({
        name: data.name,
        description: data.description || null,
        places: data.places,
        winners: data.entries.slice(0, data.places).map((entry, index) => ({
            place: index + 1,
            teams: entry.teams.map(Number),
            recipient: entry.recipient.trim() || null,
        })),
    }));

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        const options = { preserveScroll: true, onSuccess: () => onDone?.() };

        if (award) {
            form.put(`${base}/awards/${award.id}`, options);
        } else {
            form.post(`${base}/awards`, options);
        }
    };

    return { form, submit };
}

function AwardDetailsModal({ award, base, onClose }: { award: AwardRow | null; base: string; onClose: () => void }) {
    const { form, submit } = useAwardForm(award, base, onClose);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className={modalContent}>
                <form onSubmit={submit}>
                    <div className="border-b border-[#dee2e6] p-4">
                        <DialogTitle className="text-xl leading-normal font-medium">{award ? 'Edit Award' : 'Create New Award'}</DialogTitle>
                        <DialogDescription className="sr-only">{award ? 'Edit Award' : 'Create New Award'}</DialogDescription>
                    </div>
                    <div className="p-4">
                        <div className="mb-2">
                            <label htmlFor="awardNameInput" className={bs.formLabel}>
                                Award Name:
                            </label>
                            <input
                                id="awardNameInput"
                                type="text"
                                className={bs.formControl}
                                value={form.data.name}
                                onChange={(changeEvent) => form.setData('name', changeEvent.target.value)}
                                required
                            />
                            <InputError message={form.errors.name} />
                        </div>
                        <div className="mb-2">
                            <label htmlFor="awardPlacesInput" className={bs.formLabel}>
                                Places:
                            </label>
                            <select
                                id="awardPlacesInput"
                                className={bs.formSelect}
                                value={form.data.places}
                                onChange={(changeEvent) => form.setData('places', Number(changeEvent.target.value))}
                            >
                                <option value={1}>Winner only</option>
                                <option value={2}>1st and 2nd</option>
                                <option value={3}>1st to 3rd</option>
                            </select>
                        </div>
                        <div className="mb-2">
                            <label htmlFor="awardDescriptionInput" className={bs.formLabel}>
                                Description:
                            </label>
                            <textarea
                                id="awardDescriptionInput"
                                rows={4}
                                className={bs.formControl}
                                value={form.data.description}
                                onChange={(changeEvent) => form.setData('description', changeEvent.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-[#dee2e6] p-3">
                        {award &&
                            (confirmingDelete ? (
                                <button
                                    type="button"
                                    className={`${bs.btnDanger} mr-auto`}
                                    onClick={() => router.delete(`${base}/awards/${award.id}`, { preserveScroll: true, onSuccess: onClose })}
                                >
                                    Confirm Delete
                                </button>
                            ) : (
                                <button type="button" className={`${bs.btnDanger} mr-auto`} onClick={() => setConfirmingDelete(true)}>
                                    Delete
                                </button>
                            ))}
                        <button type="button" className={bs.btnSecondary} onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className={bs.btnPrimary} disabled={form.processing}>
                            Save
                        </button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function ManageAwards({ awards, base, locked }: { awards: AwardRow[]; base: string; locked: boolean }) {
    const [editing, setEditing] = useState<AwardRow | 'new' | null>(null);

    return (
        <div>
            <h2 className={bs.h2}>Manage Awards</h2>
            Presented in order listed.
            <br />
            <button type="button" className={`${bs.btnPrimary} mb-4`} disabled={locked} onClick={() => setEditing('new')}>
                Create New Award
            </button>
            {awards.map((award) => (
                <div key={award.id} className={card}>
                    <div className={cardHeader}>
                        <span>{award.name}</span>
                        <button type="button" className={bs.btnPrimary} disabled={locked} onClick={() => setEditing(award)}>
                            Edit
                        </button>
                    </div>
                    <div className="p-4">
                        <textarea rows={4} readOnly className={bs.formControl} value={award.description ?? ''} />
                    </div>
                </div>
            ))}
            {editing && (
                <AwardDetailsModal
                    key={editing === 'new' ? 'new' : editing.id}
                    award={editing === 'new' ? null : editing}
                    base={base}
                    onClose={() => setEditing(null)}
                />
            )}
        </div>
    );
}

function AwardWinnersForm({ award, base, locked, teams }: { award: AwardRow; base: string; locked: boolean; teams: TeamOption[] }) {
    const { form, submit } = useAwardForm(award, base);

    const placeError = (index: number): string | undefined =>
        Object.entries(form.errors as Record<string, string>).find(([key]) => key.startsWith(`winners.${index}.`))?.[1];

    const updateEntry = (index: number, changes: Partial<PlaceEntry>) =>
        form.setData(
            'entries',
            form.data.entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...changes } : entry)),
        );

    return (
        <form onSubmit={submit}>
            <h4 className={bs.h4}>{award.name}</h4>
            {award.description && <p className="mb-4">{award.description}</p>}
            {form.data.entries.slice(0, form.data.places).map((entry, index) => (
                <div key={index} className="mb-4">
                    <div className="font-bold capitalize">{placeLabel(index + 1, form.data.places)}</div>
                    <label htmlFor={`place-${award.id}-${index}`} className="mb-1 block">
                        Team
                    </label>
                    <TeamPicker
                        id={`place-${award.id}-${index}`}
                        teams={teams}
                        selected={entry.teams}
                        disabled={locked}
                        onChange={(numbers) => updateEntry(index, { teams: numbers })}
                    />
                    <label htmlFor={`person-${award.id}-${index}`} className="mt-2 mb-1 block">
                        Name (optional)
                    </label>
                    <input
                        id={`person-${award.id}-${index}`}
                        type="text"
                        className={`${bs.formControl} disabled:bg-[#e9ecef]`}
                        disabled={locked}
                        value={entry.recipient}
                        onChange={(changeEvent) => updateEntry(index, { recipient: changeEvent.target.value })}
                    />
                    <InputError message={placeError(index)} />
                </div>
            ))}
            {!locked && (
                <button type="submit" className={bs.btnPrimary} disabled={form.processing}>
                    Save
                </button>
            )}
        </form>
    );
}

function EnterAwards({ awards, base, locked, teams }: { awards: AwardRow[]; base: string; locked: boolean; teams: TeamOption[] }) {
    const hasTeams = teams.length > 0;
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const selected = awards.find((award) => award.id === selectedId) ?? null;

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-x-6">
                <h2 className={bs.h2}>Enter Awards</h2>
                <button
                    type="button"
                    className={`${bs.btnDanger} mb-2 sm:max-w-[16.667%]`}
                    disabled={awards.length === 0}
                    onClick={() => router.put(`${base}/awards/lock`, { locked: !locked }, { preserveScroll: true })}
                >
                    {locked ? 'Unlock Awards for Editing' : 'Finalize Awards for Presentation'}
                </button>
            </div>
            {!hasTeams && !locked && <p className="mb-4">Add teams to the event before entering winners.</p>}
            <div className="flex flex-col gap-6 lg:flex-row">
                <div className="lg:w-1/3">
                    {awards.map((award) => {
                        const active = award.id === selectedId;
                        const given = award.winners.length > 0;

                        return (
                            <button
                                key={award.id}
                                type="button"
                                className={`${listItem} ${
                                    active
                                        ? 'border-[#052c65] bg-[#052c65] text-white'
                                        : 'border-[#9ec5fe] bg-[#cfe2ff] text-[#052c65] hover:bg-[#bacbe6]'
                                }`}
                                onClick={() => setSelectedId(award.id)}
                            >
                                <span>{award.name}</span>
                                <br />
                                {given
                                    ? Array.from({ length: award.places }, (_, index) => (
                                          <span key={index}>
                                              {award.places > 1 && `${placeLabel(index + 1, award.places)}: `}
                                              {winnersText(award, index + 1) || 'NOT GIVEN'}
                                              <br />
                                          </span>
                                      ))
                                    : 'NOT GIVEN'}
                            </button>
                        );
                    })}
                </div>
                <div className="lg:w-2/3">
                    {selected ? (
                        <div className="rounded-md border border-black/[0.175] bg-white p-4">
                            <AwardWinnersForm
                                key={`${selected.id}-${selected.places}-${selected.winners.length}`}
                                award={selected}
                                base={base}
                                locked={locked}
                                teams={teams}
                            />
                        </div>
                    ) : (
                        <div>Select an award to edit</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Awards() {
    const { event, awards, teams, locked, presenting, errors } = usePage<AwardsProps>().props;
    const [tab, setTab] = useState<AwardsTab>('enter');
    const base = `/event/${event?.code}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs} hideBack>
            <Head title="Awards" />

            <div>
                <div className="text-center print:hidden">
                    <h1 className={bs.h1}>Awards Manager</h1>
                    <h5 className={bs.h5}>
                        [{event?.code}] {event?.name}
                    </h5>
                    <br />
                    <div className="mb-6 flex flex-wrap">
                        <Link
                            href={base}
                            className={cn(
                                bs.btnLight,
                                'mr-2 border-[#212529] bg-[#212529] text-white no-underline hover:border-[#373b3e] hover:bg-[#424649]',
                            )}
                        >
                            Exit
                        </Link>
                        {TABS.map((entry) => (
                            <button
                                key={entry.key}
                                type="button"
                                className={`cursor-pointer rounded-md px-4 py-2 ${tab === entry.key ? 'bg-[#0d6efd] text-white' : 'text-[#0d6efd] hover:text-[#0a58ca]'}`}
                                onClick={() => setTab(entry.key)}
                            >
                                {entry.label}
                            </button>
                        ))}
                    </div>
                </div>

                <InputError message={(errors as Record<string, string>).awards} />

                {tab === 'manage' && <ManageAwards awards={awards} base={base} locked={locked} />}
                {tab === 'enter' && <EnterAwards awards={awards} base={base} locked={locked} teams={teams} />}
                {tab === 'present' && <PresentAwards awards={awards} base={base} locked={locked} presenting={presenting} />}
            </div>
        </AppLayout>
    );
}
