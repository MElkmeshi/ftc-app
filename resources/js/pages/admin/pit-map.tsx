import PitMapEditor from '@/components/pit-map/pit-map-editor';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { type PitObject } from '@/lib/pit-map';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Event Dashboard', href: '/dashboard' },
    { title: 'Pit Map', href: '/admin/pit-map' },
];

export default function PitMapSetup() {
    const { event, objects } = usePage<SharedData & { objects: PitObject[] }>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pit Map" />

            <div>
                <h2 className={`${bs.h2} text-center`}>Pit Map Editor</h2>
                <h4 className={`${bs.h4} text-center`}>
                    [{event?.code}] {event?.name}
                </h4>
                <PitMapEditor mode="EDIT" eventCode={event?.code ?? ''} objects={objects} />
            </div>
        </AppLayout>
    );
}
