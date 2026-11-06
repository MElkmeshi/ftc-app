import PublicLayout from '@/layouts/public-layout';
import { type CompetitionEvent, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface EventsIndexProps extends SharedData {
    events: CompetitionEvent[];
}

function EventList({ events }: { events: CompetitionEvent[] }) {
    return (
        <ul className="mb-4 ml-[calc(8.333%-10px)] list-disc px-3">
            {events.map((event) => (
                <li key={event.id} className="px-4 py-2">
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

            <div>
                <h3 className="mb-2 text-[1.75rem] leading-[1.2] font-medium">Select an Event</h3>
                <br />

                {activeEvents.length === 0 ? <p className="mb-4">No events have been created yet.</p> : <EventList events={activeEvents} />}

                {auth.user?.role === 'admin' && (
                    <p>
                        <Link href="/events/create" className="inline-block rounded-md bg-[#0d6efd] px-3 py-1.5 text-white hover:bg-[#0b5ed7]">
                            Create Event
                        </Link>
                    </p>
                )}

                {archivedEvents.length > 0 && (
                    <section>
                        <h4 className="mb-2 text-2xl leading-[1.2] font-medium">Archived Events</h4>
                        <EventList events={archivedEvents} />
                    </section>
                )}
            </div>
        </PublicLayout>
    );
}
