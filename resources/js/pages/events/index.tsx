import { Badge } from '@/components/ui/badge';
import PublicLayout from '@/layouts/public-layout';
import { type CompetitionEvent, type EventTypeOption, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Archive, CalendarDays, MapPin, Plus, Trophy, Users } from 'lucide-react';

interface EventsIndexProps extends SharedData {
    events: CompetitionEvent[];
    eventTypes: EventTypeOption[];
}

function formatDates(event: CompetitionEvent): string {
    if (!event.start_date) {
        return 'Dates not set';
    }

    return event.end_date && event.end_date !== event.start_date ? `${event.start_date} → ${event.end_date}` : event.start_date;
}

function EventCard({ event, typeLabel }: { event: CompetitionEvent; typeLabel: string }) {
    return (
        <Link
            href={`/event/${event.code}`}
            className="group flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md"
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">{event.code}</div>
                    <h3 className="truncate text-lg font-semibold group-hover:text-primary">{event.name}</h3>
                </div>
                <Badge variant="secondary" className="shrink-0">
                    {typeLabel}
                </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                    <CalendarDays className="size-4" /> {formatDates(event)}
                </span>
                {event.venue && (
                    <span className="inline-flex items-center gap-1">
                        <MapPin className="size-4" /> {event.venue}
                    </span>
                )}
            </div>
            <div className="flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1">
                    <Users className="size-4 text-muted-foreground" /> {event.teams_count ?? 0} teams
                </span>
                <span className="inline-flex items-center gap-1">
                    <Trophy className="size-4 text-muted-foreground" /> {event.matches_count ?? 0} matches
                </span>
            </div>
        </Link>
    );
}

export default function EventsIndex() {
    const { events, eventTypes, auth } = usePage<EventsIndexProps>().props;
    const typeLabels = Object.fromEntries(eventTypes.map((type) => [type.value, type.label]));
    const activeEvents = events.filter((event) => !event.archived_at);
    const archivedEvents = events.filter((event) => event.archived_at);
    const canCreate = auth.user?.role === 'admin';

    return (
        <PublicLayout>
            <Head title="Events" />

            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Events</h1>
                    <p className="text-muted-foreground">Every competition hosted on this server. Pick one to see its schedule, rankings and displays.</p>
                </div>
                {canCreate && (
                    <Link
                        href="/events/create"
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="size-4" /> New event
                    </Link>
                )}
            </div>

            {activeEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center">
                    <CalendarDays className="mx-auto mb-3 size-10 text-muted-foreground" />
                    <h2 className="text-lg font-semibold">No events yet</h2>
                    <p className="text-muted-foreground">
                        {canCreate ? 'Create your first event to start adding teams and matches.' : 'Ask an admin to create an event.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {activeEvents.map((event) => (
                        <EventCard key={event.id} event={event} typeLabel={typeLabels[event.type] ?? event.type} />
                    ))}
                </div>
            )}

            {archivedEvents.length > 0 && (
                <section className="mt-10">
                    <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                        <Archive className="size-5" /> Archived
                    </h2>
                    <div className="grid gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
                        {archivedEvents.map((event) => (
                            <EventCard key={event.id} event={event} typeLabel={typeLabels[event.type] ?? event.type} />
                        ))}
                    </div>
                </section>
            )}
        </PublicLayout>
    );
}
