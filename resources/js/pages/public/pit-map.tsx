import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';

export default function PitMap() {
    const { mapUrl, event, auth } = usePage<SharedData & { mapUrl: string | null }>().props;
    const breadcrumbs: BreadcrumbItem[] = auth?.can?.controlMatches
        ? [
              { title: 'Reports', href: '/reports' },
              { title: 'Pit Map', href: '/pit-map' },
          ]
        : [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pit Map" />

            <div>
                <div className="-mx-3 flex flex-wrap justify-center">
                    <div className="w-3/12 px-3 print:hidden" />
                    <h2 className={cn(bs.h2, 'w-6/12 px-3 text-center')}>{event?.name} Pit Map</h2>
                    <div className="w-2/12 px-3 print:hidden">&nbsp;</div>
                    <button type="button" className={cn(bs.btnLight, 'w-1/12 print:hidden')} onClick={() => window.print()} title="Print">
                        <Printer className="mx-auto size-8" />
                    </button>
                </div>
                {mapUrl ? (
                    <img src={mapUrl} alt="Pit map" className="mx-auto max-w-full" />
                ) : (
                    <div className="ml-[8.333%]">No pit map has been published or created for this event</div>
                )}
            </div>
        </AppLayout>
    );
}
