import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Event Dashboard', href: '/dashboard' },
    { title: 'Pit Map', href: '/admin/pit-map' },
];

const fileInput = cn(
    bs.formControl,
    'w-auto overflow-hidden p-0 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-[#dee2e6] file:bg-[#f8f9fa] file:px-3 file:py-1.5 file:text-[#212529]',
);

export default function PitMapSetup() {
    const { event, mapUrl } = usePage<SharedData & { mapUrl: string | null }>().props;
    const form = useForm<{ map: File | null }>({ map: null });
    const [inputKey, setInputKey] = useState(0);
    const base = `/event/${event?.code}`;

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        form.post(`${base}/pit-map`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setInputKey((key) => key + 1);
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Pit Map" />

            <div>
                <h2 className={`${bs.h2} text-center`}>Pit Map Editor</h2>
                <h4 className={`${bs.h4} text-center`}>
                    [{event?.code}] {event?.name}
                </h4>

                {mapUrl && <img src={mapUrl} alt="Pit map" className="max-h-[70vh] w-auto max-w-full border border-black object-contain" />}

                <form onSubmit={submit} className="my-2 flex flex-wrap items-center justify-end gap-1">
                    <input
                        key={inputKey}
                        id="map"
                        type="file"
                        aria-label="Pit map"
                        accept=".png,.jpg,.jpeg,.webp,.svg"
                        className={cn(fileInput, 'mr-auto')}
                        onChange={(changeEvent) => form.setData('map', changeEvent.target.files?.[0] ?? null)}
                    />
                    {mapUrl && (
                        <button type="button" className={bs.btnDanger} onClick={() => router.delete(`${base}/pit-map`, { preserveScroll: true })}>
                            Clear
                        </button>
                    )}
                    <button type="submit" className={bs.btnPrimary} disabled={form.processing || form.data.map === null}>
                        Save
                    </button>
                </form>
                <InputError message={form.errors.map} />

                <div className={bs.alertInfo}>
                    Upload a picture of the pit layout. Teams find it on the event home under{' '}
                    <Link href={`${base}/pit-map`} className={bs.link}>
                        Pit Map
                    </Link>
                    . Maps do not need to be made to-scale.
                </div>
            </div>
        </AppLayout>
    );
}
