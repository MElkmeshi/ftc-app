import EventPageLayout from '@/layouts/event-page-layout';
import { Head, usePage } from '@inertiajs/react';

export default function PitMap() {
    const { mapUrl } = usePage<{ mapUrl: string | null }>().props;

    return (
        <EventPageLayout title="Pit Map">
            <Head title="Pit Map" />
            {mapUrl ? (
                <a href={mapUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={mapUrl} alt="Pit map" className="mx-auto max-h-[80vh] w-auto max-w-full object-contain" />
                </a>
            ) : (
                <p className="text-center">No pit map has been published for this event.</p>
            )}
        </EventPageLayout>
    );
}
