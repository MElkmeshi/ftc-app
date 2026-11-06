import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Event Dashboard', href: '/dashboard' },
    { title: 'Pit Map', href: '/admin/pit-map' },
];

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

            <h1 className="text-[2rem] leading-tight font-medium">Create Pit Map</h1>
            <p>
                Upload a picture of the pit layout. Teams find it on the event home under{' '}
                <Link href={`${base}/pit-map`} className="text-[#0d6efd] underline">
                    Pit Map
                </Link>
                .
            </p>

            <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
                <div className="grid gap-1">
                    <Label htmlFor="map">{mapUrl ? 'Replace pit map' : 'Pit map picture'}</Label>
                    <Input
                        key={inputKey}
                        id="map"
                        type="file"
                        accept=".png,.jpg,.jpeg,.webp,.svg"
                        onChange={(changeEvent) => form.setData('map', changeEvent.target.files?.[0] ?? null)}
                    />
                    <InputError message={form.errors.map} />
                </div>
                <Button type="submit" disabled={form.processing || form.data.map === null}>
                    Publish
                </Button>
                {mapUrl && (
                    <Button type="button" variant="destructive" onClick={() => router.delete(`${base}/pit-map`, { preserveScroll: true })}>
                        Remove
                    </Button>
                )}
            </form>

            {mapUrl ? (
                <img src={mapUrl} alt="Pit map" className="max-h-[70vh] w-auto max-w-full border object-contain" />
            ) : (
                <p className="text-muted-foreground">No pit map has been published for this event.</p>
            )}
        </AppLayout>
    );
}
