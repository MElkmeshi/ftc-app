import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { placeLabel } from '@/lib/award-utils';
import { type BreadcrumbItem, type SharedData, type Team } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Lock, LockOpen, MonitorUp, Plus, Trash2 } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

interface AwardWinnerRow {
    id: number;
    place: number;
    recipient: string | null;
    team: Pick<Team, 'id' | 'number' | 'name'> | null;
}

interface AwardRow {
    id: number;
    name: string;
    description: string | null;
    places: number;
    winners: AwardWinnerRow[];
}

interface AwardsProps extends SharedData {
    awards: AwardRow[];
    teams: Pick<Team, 'id' | 'number' | 'name'>[];
    locked: boolean;
    presenting: { award_id: number; revealed: number } | null;
}

interface PlaceEntry {
    teams: string;
    recipient: string;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Awards', href: '/admin/awards' }];

const selectClassName = 'border-input bg-background h-9 rounded-md border px-2 text-sm';

function placeEntries(award: AwardRow | null): PlaceEntry[] {
    return Array.from({ length: 3 }, (_, index) => {
        const winners = award?.winners.filter((winner) => winner.place === index + 1) ?? [];

        return {
            teams: winners
                .map((winner) => winner.team?.number)
                .filter(Boolean)
                .join(', '),
            recipient: winners.find((winner) => winner.recipient)?.recipient ?? '',
        };
    });
}

function parseTeamNumbers(text: string): number[] {
    return text
        .split(/[\s,]+/)
        .map((part) => part.trim())
        .filter((part) => part !== '')
        .map((part) => Number(part));
}

function AwardEditor({ award, base, onDone }: { award: AwardRow | null; base: string; onDone?: () => void }) {
    const form = useForm({
        name: award?.name ?? '',
        description: award?.description ?? '',
        places: award?.places ?? 1,
        entries: placeEntries(award),
    });
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    form.transform((data) => ({
        name: data.name,
        description: data.description || null,
        places: data.places,
        winners: data.entries.slice(0, data.places).map((entry, index) => ({
            place: index + 1,
            teams: parseTeamNumbers(entry.teams),
            recipient: entry.recipient.trim() || null,
        })),
    }));

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                if (!award) {
                    form.reset();
                }
                onDone?.();
            },
        };

        if (award) {
            form.put(`${base}/awards/${award.id}`, options);
        } else {
            form.post(`${base}/awards`, options);
        }
    };

    const placeError = (index: number): string | undefined =>
        Object.entries(form.errors as Record<string, string>).find(([key]) => key.startsWith(`winners.${index}.`))?.[1];

    const updateEntry = (index: number, changes: Partial<PlaceEntry>) =>
        form.setData(
            'entries',
            form.data.entries.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...changes } : entry)),
        );

    return (
        <form onSubmit={submit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
                <div className="grid gap-1.5">
                    <Label htmlFor={`name-${award?.id ?? 'new'}`}>Award</Label>
                    <Input
                        id={`name-${award?.id ?? 'new'}`}
                        value={form.data.name}
                        onChange={(changeEvent) => form.setData('name', changeEvent.target.value)}
                        placeholder="e.g. Best Design"
                        required
                    />
                    <InputError message={form.errors.name} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`places-${award?.id ?? 'new'}`}>Places</Label>
                    <select
                        id={`places-${award?.id ?? 'new'}`}
                        className={selectClassName}
                        value={form.data.places}
                        onChange={(changeEvent) => form.setData('places', Number(changeEvent.target.value))}
                    >
                        <option value={1}>Winner only</option>
                        <option value={2}>1st and 2nd</option>
                        <option value={3}>1st to 3rd</option>
                    </select>
                </div>
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor={`description-${award?.id ?? 'new'}`}>What it is for (read before the winner is revealed)</Label>
                <Input
                    id={`description-${award?.id ?? 'new'}`}
                    value={form.data.description}
                    onChange={(changeEvent) => form.setData('description', changeEvent.target.value)}
                />
            </div>

            <div className="space-y-2">
                {form.data.entries.slice(0, form.data.places).map((entry, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[6rem_1fr_1fr] sm:items-center">
                        <span className="text-sm font-medium">{placeLabel(index + 1, form.data.places)}</span>
                        <Input
                            aria-label={`${placeLabel(index + 1, form.data.places)} team numbers`}
                            placeholder="Team numbers, e.g. 1234, 5678"
                            value={entry.teams}
                            onChange={(changeEvent) => updateEntry(index, { teams: changeEvent.target.value })}
                        />
                        <Input
                            aria-label={`${placeLabel(index + 1, form.data.places)} person`}
                            placeholder="Person (optional)"
                            value={entry.recipient}
                            onChange={(changeEvent) => updateEntry(index, { recipient: changeEvent.target.value })}
                        />
                        <InputError message={placeError(index)} className="sm:col-span-3" />
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" size="sm" disabled={form.processing}>
                    {award ? (
                        'Save'
                    ) : (
                        <>
                            <Plus className="mr-1 size-4" /> Add award
                        </>
                    )}
                </Button>
                {form.recentlySuccessful && <span className="text-muted-foreground text-sm">Saved</span>}
                {award &&
                    (confirmingDelete ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => router.delete(`${base}/awards/${award.id}`, { preserveScroll: true })}
                        >
                            Confirm delete
                        </Button>
                    ) : (
                        <Button type="button" size="sm" variant="ghost" aria-label={`Delete ${award.name}`} onClick={() => setConfirmingDelete(true)}>
                            <Trash2 className="size-4" />
                        </Button>
                    ))}
            </div>
        </form>
    );
}

function WinnerSummary({ award }: { award: AwardRow }) {
    return (
        <ul className="space-y-1 text-sm">
            {Array.from({ length: award.places }, (_, index) => {
                const winners = award.winners.filter((winner) => winner.place === index + 1);

                return (
                    <li key={index} className="flex gap-2">
                        <span className="text-muted-foreground w-20 shrink-0">{placeLabel(index + 1, award.places)}</span>
                        <span>
                            {winners.length === 0 ? (
                                <span className="text-amber-600">Not entered</span>
                            ) : (
                                winners
                                    .map((winner) =>
                                        [winner.team ? `${winner.team.number} ${winner.team.name}` : null, winner.recipient]
                                            .filter(Boolean)
                                            .join(' · '),
                                    )
                                    .join(', ')
                            )}
                        </span>
                    </li>
                );
            })}
        </ul>
    );
}

function PresentControls({ award, base, presenting }: { award: AwardRow; base: string; presenting: AwardsProps['presenting'] }) {
    const isShowing = presenting?.award_id === award.id;
    const revealed = isShowing ? presenting.revealed : 0;
    const nextPlace = award.places - revealed;
    const present = (count: number) => router.post(`${base}/awards/${award.id}/present`, { revealed: count }, { preserveScroll: true });

    return (
        <div className="flex flex-wrap items-center gap-2">
            {isShowing && <Badge>On display</Badge>}
            {!isShowing && (
                <Button size="sm" variant="outline" onClick={() => present(0)}>
                    <MonitorUp className="mr-1 size-4" /> Show award
                </Button>
            )}
            {isShowing && nextPlace >= 1 && (
                <Button size="sm" onClick={() => present(revealed + 1)}>
                    Reveal {placeLabel(nextPlace, award.places).toLowerCase()}
                </Button>
            )}
            {isShowing && revealed > 0 && (
                <Button size="sm" variant="ghost" onClick={() => present(revealed - 1)}>
                    Undo reveal
                </Button>
            )}
        </div>
    );
}

/**
 * The event's awards (FTC Live's award setup and Give Awards pages): add
 * awards, enter who won each place, lock the results, then reveal them on
 * the audience display one place at a time, lowest place first.
 */
export default function Awards() {
    const { event, awards, teams, locked, presenting, errors } = usePage<AwardsProps>().props;
    const base = `/event/${event?.code}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Awards" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Awards</h1>
                        <p className="text-muted-foreground">
                            {locked
                                ? 'Results are locked. Show an award on the audience display, then reveal its places one at a time.'
                                : 'Add the awards and enter who won. Lock the results when they are final to present them.'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {presenting && (
                            <Button variant="outline" onClick={() => router.delete(`${base}/awards/presenting`, { preserveScroll: true })}>
                                Clear display
                            </Button>
                        )}
                        <Button
                            variant={locked ? 'outline' : 'default'}
                            disabled={awards.length === 0}
                            onClick={() => router.put(`${base}/awards/lock`, { locked: !locked }, { preserveScroll: true })}
                        >
                            {locked ? (
                                <>
                                    <LockOpen className="mr-1 size-4" /> Unlock to edit
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-1 size-4" /> Lock results
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <InputError message={(errors as Record<string, string>).awards} />

                {teams.length === 0 && !locked && <p className="text-muted-foreground text-sm">Add teams to the event before entering winners.</p>}

                <div className="grid gap-4 xl:grid-cols-2">
                    {awards.map((award) => (
                        <Card key={award.id}>
                            <CardHeader>
                                <CardTitle>{award.name}</CardTitle>
                                {award.description && <CardDescription>{award.description}</CardDescription>}
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {locked ? (
                                    <>
                                        <WinnerSummary award={award} />
                                        <PresentControls award={award} base={base} presenting={presenting} />
                                    </>
                                ) : (
                                    <AwardEditor key={`${award.id}-${award.places}-${award.winners.length}`} award={award} base={base} />
                                )}
                            </CardContent>
                        </Card>
                    ))}

                    {!locked && (
                        <Card className="border-dashed">
                            <CardHeader>
                                <CardTitle>New award</CardTitle>
                                <CardDescription>
                                    Winners can be entered now or later. Use several team numbers for an alliance award.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <AwardEditor award={null} base={base} />
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
