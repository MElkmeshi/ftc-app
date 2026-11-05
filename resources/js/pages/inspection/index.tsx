import InputError from '@/components/input-error';
import { InspectionStatusBadge } from '@/components/inspection-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { INSPECTION_STATUSES, passedShare, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage, useProp } from '@inertiajs/react';
import { ChevronRight, Monitor } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

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
        <Card>
            <CardHeader>
                <CardTitle>Checklist</CardTitle>
                <CardDescription>
                    One item per line. Match it to your game&apos;s robot rules. A robot passes only with every item ticked.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="space-y-3">
                    <textarea
                        aria-label="Checklist items"
                        className="border-input bg-background min-h-48 w-full rounded-md border p-3 text-sm"
                        value={form.data.items}
                        onChange={(changeEvent) => form.setData('items', changeEvent.target.value)}
                    />
                    <InputError message={itemError} />
                    <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={form.processing}>
                            Save checklist
                        </Button>
                        {form.recentlySuccessful && <span className="text-muted-foreground text-sm">Saved</span>}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

/**
 * Every team's inspection status (FTC Live's Robot Inspection page). Pick a
 * team to inspect it on this device.
 */
export default function Inspection() {
    const { event, auth, checklist } = usePage<SharedData & { checklist: string[] }>().props;
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('teams');
    const [search, setSearch] = useState('');
    const base = `/event/${event?.code}`;
    const query = search.trim().toLowerCase();
    const visible = teams.filter((team) => query === '' || `${team.number} ${team.name ?? ''}`.toLowerCase().includes(query));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inspection" />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Robot inspection</h1>
                        <p className="text-muted-foreground">{passedShare(teams)}% of teams have passed.</p>
                    </div>
                    <Button variant="outline" asChild>
                        <a href={`${base}/inspection/status`} target="_blank" rel="noreferrer">
                            <Monitor className="mr-1 size-4" /> Status board
                        </a>
                    </Button>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                    {INSPECTION_STATUSES.map((status) => (
                        <span key={status.value} className="flex items-center gap-1.5">
                            <InspectionStatusBadge status={status.value} />
                            {teams.filter((team) => team.status === status.value).length}
                        </span>
                    ))}
                </div>

                <Input
                    type="search"
                    placeholder="Find a team by number or name"
                    value={search}
                    onChange={(changeEvent) => setSearch(changeEvent.target.value)}
                    className="max-w-sm"
                />

                {teams.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center">Add teams to the event to start inspecting.</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {visible.map((team) => (
                            <li key={team.id}>
                                <Link href={`${base}/inspection/${team.id}`} className="hover:bg-accent flex items-center gap-3 px-4 py-3">
                                    <span className="w-16 font-mono font-semibold">{team.number}</span>
                                    <span className="min-w-0 flex-1 truncate">{team.name}</span>
                                    <InspectionStatusBadge status={team.status} />
                                    <ChevronRight className="text-muted-foreground size-4" />
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {auth.user?.role === 'admin' && <ChecklistEditor checklist={checklist} base={base} />}
            </div>
        </AppLayout>
    );
}
