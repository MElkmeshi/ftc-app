import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionEvent, type DashboardStats, type EventTypeOption, type EventTypeValue, type SharedData } from '@/types';
import { Deferred, Head, Link, router, useForm, usePage, useProp } from '@inertiajs/react';
import {
    Activity,
    Archive,
    ArchiveRestore,
    CheckCircle,
    CheckCircle2,
    Circle,
    CircleDashed,
    Download,
    ExternalLink,
    MonitorPlay,
    Trophy,
    Users,
} from 'lucide-react';
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
    stats?: DashboardStats;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Event Dashboard', href: '/dashboard' }];

const STATUS_STYLES: Record<StepStatus, { icon: typeof Circle; className: string; label: string }> = {
    done: { icon: CheckCircle2, className: 'text-emerald-500', label: 'Done' },
    in_progress: { icon: CircleDashed, className: 'text-amber-500', label: 'In progress' },
    todo: { icon: Circle, className: 'text-muted-foreground', label: 'To do' },
    optional: { icon: Circle, className: 'text-sky-500', label: 'Optional' },
};

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

function SetupChecklist({ eventCode }: { eventCode: string }) {
    const { value: steps = [] } = useProp<SetupStep[]>('steps');

    return (
        <Card>
            <CardHeader>
                <CardTitle>Event setup</CardTitle>
                <p className="text-muted-foreground text-sm">Work down the list. Each step updates on its own as the event progresses.</p>
            </CardHeader>
            <CardContent className="p-0">
                <ol className="divide-y">
                    {steps.map((step, index) => {
                        const style = STATUS_STYLES[step.status];
                        const href = step.href.startsWith('/dashboard#') ? step.href.replace('/dashboard', '') : `/event/${eventCode}${step.href}`;

                        return (
                            <li key={step.key}>
                                <Link href={href} className="hover:bg-muted/50 flex items-center gap-4 px-6 py-3 transition">
                                    <span className="text-muted-foreground w-6 text-right font-mono text-sm tabular-nums">{index}</span>
                                    <style.icon className={cn('size-5 shrink-0', style.className)} aria-label={style.label} />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium">{step.title}</div>
                                        <div className="text-muted-foreground truncate text-sm">{step.description}</div>
                                    </div>
                                    <Badge variant={step.status === 'done' ? 'secondary' : 'outline'} className="shrink-0">
                                        {step.detail}
                                    </Badge>
                                </Link>
                            </li>
                        );
                    })}
                </ol>
            </CardContent>
        </Card>
    );
}

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

function EventDetailsForm({ event, eventTypes }: { event: CompetitionEvent; eventTypes: EventTypeOption[] }) {
    const { data, setData, put, errors, processing, recentlySuccessful } = useForm({
        name: event.name,
        type: event.type,
        venue: event.venue ?? '',
        timezone: event.timezone,
        start_date: event.start_date ?? '',
        end_date: event.end_date ?? '',
        field_count: event.field_count,
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
    const { event, eventTypes } = usePage<DashboardProps>().props;

    if (!event) {
        return null;
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${event.name} · Dashboard`} />

            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <div className="text-muted-foreground font-mono text-sm">{event.code}</div>
                        <h1 className="text-2xl font-bold">{event.name}</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={`/event/${event.code}`}>
                                <ExternalLink className="mr-1 size-4" /> Event home
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/event/${event.code}/referee/match-control`}>
                                <MonitorPlay className="mr-1 size-4" /> Match control
                            </Link>
                        </Button>
                    </div>
                </div>

                <Deferred data="stats" fallback={<StatsSkeleton />}>
                    <StatsCards />
                </Deferred>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <SetupChecklist eventCode={event.code} />
                    <div className="space-y-6">
                        <EventDetailsForm key={event.code} event={event} eventTypes={eventTypes} />
                        <ExportCard event={event} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
