import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { resolveEventHref } from '@/lib/event';
import { cn } from '@/lib/utils';
import {
    type BreadcrumbItem,
    type CompetitionEvent,
    type DashboardStats,
    type EventTypeOption,
    type EventTypeValue,
    type GameOption,
    type SharedData,
} from '@/types';
import { Deferred, Head, Link, router, useForm, usePage, useProp } from '@inertiajs/react';
import { Activity, Archive, ArchiveRestore, CheckCircle, Download, Trophy, Users } from 'lucide-react';
import { type FormEventHandler } from 'react';

type StepStatus = 'done' | 'in_progress' | 'todo' | 'optional';

interface SetupStep {
    key: string;
    title: string;
    description: string;
    status: StepStatus;
    detail: string;
    href: string;
}

interface DashboardProps extends SharedData {
    eventTypes: EventTypeOption[];
    games: GameOption[];
    gameLocked: boolean;
    stats?: DashboardStats;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Event Dashboard', href: '/dashboard' }];

function StatsCards() {
    const { stats } = usePage<DashboardProps>().props;

    const cards = [
        { title: 'Teams', value: stats?.total_teams ?? 0, icon: Users },
        { title: 'Matches', value: stats?.total_matches ?? 0, icon: Trophy },
        { title: 'Completed', value: stats?.completed_matches ?? 0, icon: CheckCircle },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <Card key={card.title}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                        <card.icon className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                    </CardContent>
                </Card>
            ))}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">On the field</CardTitle>
                    <Activity className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    {stats?.ongoing_match ? (
                        <div className="text-2xl font-bold text-emerald-600">Match {stats.ongoing_match.number}</div>
                    ) : (
                        <div className="text-muted-foreground text-sm">No match running</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="pb-2">
                        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

const STEP_STATUS_CLASS: Record<StepStatus, string> = {
    done: 'text-[#198754]',
    in_progress: '',
    todo: 'text-[#dc3545]',
    optional: '',
};

function SetupChecklist({ eventCode }: { eventCode: string }) {
    const { value: steps = [] } = useProp<SetupStep[]>('steps');

    return (
        <table className="mx-auto w-full max-w-[520px] text-center">
            <thead>
                <tr className="border-b">
                    <th className="p-2">Step</th>
                    <th className="p-2">Action</th>
                    <th className="p-2">Status</th>
                </tr>
            </thead>
            <tbody>
                {steps.map((step, index) => {
                    const href = step.href.startsWith('/dashboard#')
                        ? step.href.replace('/dashboard', '')
                        : resolveEventHref(step.href, `/event/${eventCode}/`);

                    return (
                        <tr key={step.key} className="border-b align-top">
                            <td className="p-2 font-bold">{index}</td>
                            <td className="p-2">
                                <Button
                                    asChild
                                    variant={step.status === 'optional' ? 'outline' : 'secondary'}
                                    className="w-full"
                                    title={step.description}
                                >
                                    <Link href={href}>{step.title}</Link>
                                </Button>
                            </td>
                            <td className={cn('p-2', STEP_STATUS_CLASS[step.status])}>{step.detail}</td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

function EventDetailsForm({
    event,
    eventTypes,
    games,
    gameLocked,
}: {
    event: CompetitionEvent;
    eventTypes: EventTypeOption[];
    games: GameOption[];
    gameLocked: boolean;
}) {
    const { data, setData, put, errors, processing, recentlySuccessful } = useForm({
        name: event.name,
        type: event.type,
        venue: event.venue ?? '',
        timezone: event.timezone,
        start_date: event.start_date ?? '',
        end_date: event.end_date ?? '',
        field_count: event.field_count,
        game_id: event.game_id ?? games[0]?.id ?? 0,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/event/${event.code}`, { preserveScroll: true });
    };

    return (
        <Card id="details">
            <CardHeader>
                <CardTitle>Event details</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Event code <code className="font-mono">{event.code}</code> is fixed because it is part of every display and tablet URL.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <select
                            id="type"
                            className={selectClassName}
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value as EventTypeValue)}
                        >
                            {eventTypes.map((type) => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="field_count">Fields</Label>
                        <Input
                            id="field_count"
                            type="number"
                            min={1}
                            max={8}
                            value={data.field_count}
                            onChange={(e) => setData('field_count', Number(e.target.value))}
                        />
                        <InputError message={errors.field_count} />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="game_id">Game</Label>
                        <div className="flex gap-2">
                            <select
                                id="game_id"
                                className={selectClassName}
                                value={data.game_id}
                                disabled={gameLocked}
                                onChange={(e) => setData('game_id', Number(e.target.value))}
                            >
                                {games.map((game) => (
                                    <option key={game.id} value={game.id}>
                                        {game.name}
                                    </option>
                                ))}
                            </select>
                            <Button asChild variant="outline" type="button">
                                <Link href="/games">Games</Link>
                            </Button>
                        </div>
                        <p className="text-muted-foreground text-xs">
                            {gameLocked
                                ? 'This event already has scores, so it stays on this game. You can still edit the game itself.'
                                : 'Score types, match timing and ranking come from the game.'}
                        </p>
                        <InputError message={errors.game_id} />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                        <Label htmlFor="venue">Venue</Label>
                        <Input id="venue" value={data.venue} onChange={(e) => setData('venue', e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="start_date">Start date</Label>
                        <Input id="start_date" type="date" value={data.start_date} onChange={(e) => setData('start_date', e.target.value)} />
                        <InputError message={errors.start_date} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="end_date">End date</Label>
                        <Input id="end_date" type="date" value={data.end_date} onChange={(e) => setData('end_date', e.target.value)} />
                        <InputError message={errors.end_date} />
                    </div>
                    <div className="flex items-center justify-end gap-3 sm:col-span-2">
                        {recentlySuccessful && <span className="text-muted-foreground text-sm">Saved.</span>}
                        <Button type="submit" disabled={processing}>
                            Save details
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

function ExportCard({ event }: { event: CompetitionEvent }) {
    const archived = event.archived_at !== null;

    return (
        <Card id="export">
            <CardHeader>
                <CardTitle>Export &amp; archive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground">
                        Download everything about this event (teams, game, schedule, scores, alliances) as one file.
                    </p>
                    <Button asChild variant="outline">
                        <a href={`/api/event/${event.code}/export`}>
                            <Download className="mr-1 size-4" /> Download event file
                        </a>
                    </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-muted-foreground">
                        {archived
                            ? 'This event is archived and listed under “Archived” on the home page.'
                            : 'Archive the event once it is over to tidy up the event list.'}
                    </p>
                    <Button variant="outline" onClick={() => router.post(`/event/${event.code}/archive`, {}, { preserveScroll: true })}>
                        {archived ? <ArchiveRestore className="mr-1 size-4" /> : <Archive className="mr-1 size-4" />}
                        {archived ? 'Restore event' : 'Archive event'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const { event, eventTypes, games, gameLocked } = usePage<DashboardProps>().props;

    if (!event) {
        return null;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${event.name} · Dashboard`} />

            <div className="space-y-6">
                <div className="text-center">
                    <h1 className="text-[2.5rem] leading-tight font-medium">{event.code} Dashboard</h1>
                    <h2 className="text-[1.75rem] leading-tight font-medium">{event.name}</h2>
                </div>

                <SetupChecklist eventCode={event.code} />

                <Deferred data="stats" fallback={<StatsSkeleton />}>
                    <StatsCards />
                </Deferred>

                <div className="grid gap-6 xl:grid-cols-2">
                    <EventDetailsForm key={event.code} event={event} eventTypes={eventTypes} games={games} gameLocked={gameLocked} />
                    <ExportCard event={event} />
                </div>
            </div>
        </AppLayout>
    );
}
