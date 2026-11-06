import PublicLayout from '@/layouts/public-layout';
import { type CompetitionEvent, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface EventsIndexProps extends SharedData {
    events: CompetitionEvent[];
}

function EventList({ events }: { events: CompetitionEvent[] }) {
    return (
        <ul className="list-disc pl-[7.5rem] max-sm:pl-10">
            {events.map((event) => (
                <li key={event.id} className="my-4">
                    <Link href={`/event/${event.code}`} className="text-[#0d6efd] underline">
                        {event.code}: {event.name}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

export default function EventsIndex() {
    const { events, auth } = usePage<EventsIndexProps>().props;
    const activeEvents = events.filter((event) => !event.archived_at);
    const archivedEvents = events.filter((event) => event.archived_at);

    return (
        <PublicLayout>
            <Head title="Events" />

            <h3 className="text-[1.75rem] leading-tight font-medium">Select an Event</h3>

            {activeEvents.length === 0 ? <p className="mt-4">No events have been created yet.</p> : <EventList events={activeEvents} />}

            {auth.user?.role === 'admin' && (
                <p>
                    <Link href="/events/create" className="rounded-md bg-[#0d6efd] px-3 py-1.5 text-white hover:bg-[#0b5ed7]">
                        Create Event
                    </Link>
                </p>
            )}

            {archivedEvents.length > 0 && (
                <section>
                    <h4 className="mt-6 text-2xl leading-tight font-medium">Archived Events</h4>
                    <EventList events={archivedEvents} />
                </section>
            )}
        </PublicLayout>
    );
}
