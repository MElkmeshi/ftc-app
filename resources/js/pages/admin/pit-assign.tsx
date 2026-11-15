import PitMapEditor from '@/components/pit-map/pit-map-editor';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { type PitMapConfig, type PitObject, type PitTeam } from '@/lib/pit-map';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Pit Map Editor', href: '/admin/pit-map' },
    { title: 'Pit Assignment', href: '/admin/pit-map/assign' },
];

export default function PitAssignment() {
    const { event, objects, config, teams } = usePage<SharedData & { objects: PitObject[]; config: PitMapConfig; teams: PitTeam[] }>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pit Assignment" />

            <div>
                <h2 className={`${bs.h2} text-center`}>Pit Assignment</h2>
                <h4 className={`${bs.h4} text-center`}>
                    [{event?.code}] {event?.name}
                </h4>
                <PitMapEditor mode="ASSIGN" eventCode={event?.code ?? ''} objects={objects} config={config} teams={teams} />
            </div>
        </AppLayout>
    );
}
