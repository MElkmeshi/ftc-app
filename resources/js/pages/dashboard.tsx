import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionEvent, type EventTypeOption, type EventTypeValue, type GameOption, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage, useProp } from '@inertiajs/react';
import { type FormEventHandler, type ReactNode } from 'react';

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
}

interface DashboardRow {
    key: string;
    label: string;
    outline: boolean;
    status: ReactNode;
    statusClassName?: string;
    href?: string;
    download?: boolean;
    onClick?: () => void;
}

const dashboardBreadcrumbs: BreadcrumbItem[] = [{ title: 'Event Dashboard', href: '/dashboard' }];

const editEventBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Edit Event', href: '/dashboard?view=edit' },
];

function doneOrNotStarted(step: SetupStep | undefined): Pick<DashboardRow, 'status' | 'statusClassName'> {
    if (!step) {
        return { status: ' ' };
    }

    return step.status === 'done' ? { status: 'Done', statusClassName: bs.textSuccess } : { status: 'Not Started', statusClassName: bs.textDanger };
}

function doneOrOptional(step: SetupStep | undefined): Pick<DashboardRow, 'status' | 'statusClassName'> {
    if (!step) {
        return { status: ' ' };
    }

    return step.status === 'done' ? { status: 'Done', statusClassName: bs.textSuccess } : { status: '(Optional)' };
}

function isUnstarted(step: SetupStep | undefined): boolean {
    return step?.status === 'todo' || step?.status === 'optional';
}

function dashboardRows(event: CompetitionEvent, steps: SetupStep[]): DashboardRow[] {
    const base = `/event/${event.code}`;
    const step = (key: string): SetupStep | undefined => steps.find((candidate) => candidate.key === key);
    const archived = event.archived_at !== null;

    return [
        {
            key: 'details',
            label: 'Edit Event',
            outline: false,
            href: `${base}/dashboard?view=edit`,
            status: 'Done',
            statusClassName: bs.textSuccess,
        },
        { key: 'accounts', label: 'Create Default Accounts', outline: false, href: '/accounts?view=default', ...doneOrNotStarted(step('accounts')) },
        {
            key: 'teams',
            label: 'Add/Edit Teams',
            outline: false,
            href: `${base}/admin/teams`,
            status: step('teams') ? `${step('teams')?.detail} added` : ' ',
        },
        {
            key: 'sponsors',
            label: 'Add/Edit Sponsors',
            outline: false,
            href: `${base}/admin/sponsors`,
            status: step('sponsors')?.detail ?? ' ',
        },
        {
            key: 'pit-map',
            label: 'Create Pit Map',
            outline: step('pit-map')?.status !== 'done',
            href: `${base}/admin/pit-map`,
            ...doneOrOptional(step('pit-map')),
        },
        {
            key: 'practice-schedule',
            label: 'Create Practice Schedule',
            outline: isUnstarted(step('practice-schedule')),
            href: `${base}/competition-matches?practice=1`,
            ...doneOrNotStarted(step('practice-schedule')),
        },
        {
            key: 'schedule',
            label: 'Create Match Schedule',
            outline: isUnstarted(step('schedule')),
            href: `${base}/competition-matches`,
            ...doneOrNotStarted(step('schedule')),
        },
        { key: 'awards', label: 'Manage Awards', outline: false, href: `${base}/admin/awards`, status: ' ' },
        {
            key: 'archive-file',
            label: 'Download Archive File',
            outline: false,
            href: `/api/event/${event.code}/export`,
            download: true,
            status: '',
        },
        {
            key: 'score-types',
            label: 'Score Types',
            outline: isUnstarted(step('score-types')),
            href: `${base}/admin/score-types`,
            ...doneOrNotStarted(step('score-types')),
        },
        {
            key: 'timing',
            label: 'Match Timing',
            outline: step('timing')?.status !== 'done',
            href: `${base}/admin/competition-settings`,
            ...doneOrOptional(step('timing')),
        },
        {
            key: 'alliance-selection',
            label: 'Alliance Selection',
            outline: isUnstarted(step('alliance-selection')),
            href: `${base}/admin/alliance-selection`,
            ...doneOrNotStarted(step('alliance-selection')),
        },
        {
            key: 'archive',
            label: archived ? 'Restore Event' : 'Archive Event',
            outline: !archived,
            onClick: () => router.post(`${base}/archive`, {}, { preserveScroll: true }),
            status: archived ? 'Done' : '(Optional)',
            statusClassName: archived ? bs.textSuccess : undefined,
        },
    ];
}

function DashboardAction({ row }: { row: DashboardRow }) {
    const className = `${row.outline ? bs.btnOutlineSecondary : bs.btnSecondary} w-full no-underline`;

    if (row.onClick) {
        return (
            <button type="button" className={className} onClick={row.onClick}>
                {row.label}
            </button>
        );
    }

    if (row.download) {
        return (
            <a href={row.href} className={className}>
                {row.label}
            </a>
        );
    }

    return (
        <Link href={row.href ?? ''} className={className}>
            {row.label}
        </Link>
    );
}

function DashboardTable({ event }: { event: CompetitionEvent }) {
    const { value: steps = [] } = useProp<SetupStep[]>('steps');

    return (
        <div className="mx-auto w-fit">
            <table className={`${bs.table} text-center`}>
                <thead>
                    <tr>
                        <th scope="col">Step</th>
                        <th scope="col">Action</th>
                        <th scope="col">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {dashboardRows(event, steps).map((row, index) => (
                        <tr key={row.key}>
                            <th scope="row">{index + 1}</th>
                            <td className="min-w-[322px]">
                                <DashboardAction row={row} />
                            </td>
                            <td className={`min-w-[154px] ${row.statusClassName ?? ''}`}>{row.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function EditEventForm({
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
        <form onSubmit={submit} className="md:mx-auto md:w-1/2 md:px-3">
            <h2 className={bs.h2}>Edit Event</h2>
            <hr className="my-4 border-t border-black/25" />
            <div className="mb-2">
                <label htmlFor="eventCodeInput" className={bs.formLabel}>
                    Event Code:
                </label>
                <input
                    id="eventCodeInput"
                    type="text"
                    className={cn(bs.formControl, 'bg-[#e9ecef]')}
                    placeholder="Event Code"
                    disabled
                    value={event.code}
                />
            </div>
            <div className="mb-2">
                <label htmlFor="eventNameInput" className={bs.formLabel}>
                    Event Name:
                </label>
                <input
                    id="eventNameInput"
                    type="text"
                    className={bs.formControl}
                    placeholder="Event Name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                />
                <InputError message={errors.name} />
            </div>
            <div className="mb-2">
                <label htmlFor="eventVenueInput" className={bs.formLabel}>
                    Venue:
                </label>
                <input
                    id="eventVenueInput"
                    type="text"
                    className={bs.formControl}
                    placeholder="Venue"
                    value={data.venue}
                    onChange={(e) => setData('venue', e.target.value)}
                />
            </div>
            <div className="mb-2">
                <label htmlFor="eventTypeInput" className={bs.formLabel}>
                    Event Type:
                </label>
                <select
                    id="eventTypeInput"
                    className={bs.formSelect}
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
            <div className="mb-2">
                <label htmlFor="eventGameInput" className={bs.formLabel}>
                    Game:
                </label>
                <select
                    id="eventGameInput"
                    className={`${bs.formSelect} disabled:bg-[#e9ecef]`}
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
                <InputError message={errors.game_id} />
            </div>
            <div className="mb-2">
                <label htmlFor="startDatePicker" className={bs.formLabel}>
                    Event Start Date:
                </label>
                <input
                    id="startDatePicker"
                    type="date"
                    className={bs.formControl}
                    value={data.start_date}
                    onChange={(e) => setData('start_date', e.target.value)}
                />
                <InputError message={errors.start_date} />
            </div>
            <div className="mb-2">
                <label htmlFor="endDatePicker" className={bs.formLabel}>
                    Event End Date:
                </label>
                <input
                    id="endDatePicker"
                    type="date"
                    className={bs.formControl}
                    value={data.end_date}
                    onChange={(e) => setData('end_date', e.target.value)}
                />
                <InputError message={errors.end_date} />
            </div>
            <br />
            <div className="mb-2">
                <label htmlFor="fieldNumberInput" className={bs.formLabel}>
                    Number of Fields:
                </label>
                <input
                    id="fieldNumberInput"
                    type="number"
                    min={1}
                    max={8}
                    className={bs.formControl}
                    placeholder="Number of Fields"
                    value={data.field_count}
                    onChange={(e) => setData('field_count', Number(e.target.value))}
                />
                <InputError message={errors.field_count} />
            </div>
            <button type="submit" className={bs.btnPrimary} disabled={processing}>
                Save Event
            </button>
            {recentlySuccessful && <span className={`ml-3 ${bs.textSuccess}`}>Saved.</span>}
        </form>
    );
}

export default function Dashboard() {
    const { props, url } = usePage<DashboardProps>();
    const { event, eventTypes, games, gameLocked } = props;

    if (!event) {
        return null;
    }

    if (url.includes('view=edit')) {
        return (
            <AppLayout breadcrumbs={editEventBreadcrumbs}>
                <Head title={`${event.name} · Edit Event`} />
                <EditEventForm key={event.code} event={event} eventTypes={eventTypes} games={games} gameLocked={gameLocked} />
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={dashboardBreadcrumbs}>
            <Head title={`${event.name} · Dashboard`} />

            <div>
                <h2 className={`${bs.h2} text-center`}>{event.code} Dashboard</h2>
                <h4 className={`${bs.h4} text-center`}>{eventTypes.find((type) => type.value === event.type)?.label ?? event.name}</h4>
                <DashboardTable event={event} />
            </div>
        </AppLayout>
    );
}
