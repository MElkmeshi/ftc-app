import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData, type Sponsor } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Event Dashboard', href: '/dashboard' },
    { title: 'Sponsors', href: '/admin/sponsors' },
];

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg';

function SponsorForm({ sponsor, base, onDone }: { sponsor: Sponsor | null; base: string; onDone?: () => void }) {
    const form = useForm<{ name: string; level: string; logo: File | null }>({ name: sponsor?.name ?? '', level: sponsor?.level ?? '', logo: null });
    const [inputKey, setInputKey] = useState(0);

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        form.post(sponsor ? `${base}/sponsors/${sponsor.id}` : `${base}/sponsors`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if (!sponsor) {
                    form.reset();
                    setInputKey((key) => key + 1);
                }

                onDone?.();
            },
        });
    };

    return (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end">
            <div className="grid gap-1">
                <Label htmlFor={`name-${sponsor?.id ?? 'new'}`}>Name</Label>
                <Input
                    id={`name-${sponsor?.id ?? 'new'}`}
                    value={form.data.name}
                    onChange={(changeEvent) => form.setData('name', changeEvent.target.value)}
                />
                <InputError message={form.errors.name} />
            </div>
            <div className="grid gap-1">
                <Label htmlFor={`level-${sponsor?.id ?? 'new'}`}>Level</Label>
                <Input
                    id={`level-${sponsor?.id ?? 'new'}`}
                    placeholder="e.g. Gold"
                    value={form.data.level}
                    onChange={(changeEvent) => form.setData('level', changeEvent.target.value)}
                />
                <InputError message={form.errors.level} />
            </div>
            <div className="grid gap-1">
                <Label htmlFor={`logo-${sponsor?.id ?? 'new'}`}>{sponsor?.logo_url ? 'Replace logo' : 'Logo'}</Label>
                <Input
                    key={inputKey}
                    id={`logo-${sponsor?.id ?? 'new'}`}
                    type="file"
                    accept={ACCEPT}
                    onChange={(changeEvent) => form.setData('logo', changeEvent.target.files?.[0] ?? null)}
                />
                <InputError message={form.errors.logo} />
            </div>
            <div className="flex gap-2">
                <Button type="submit" disabled={form.processing}>
                    {sponsor ? 'Save' : 'Add Sponsor'}
                </Button>
                {onDone && sponsor && (
                    <Button type="button" variant="outline" onClick={onDone}>
                        Cancel
                    </Button>
                )}
            </div>
        </form>
    );
}

export default function Sponsors() {
    const { event, sponsors } = usePage<SharedData & { sponsors: Sponsor[] }>().props;
    const [editingId, setEditingId] = useState<number | null>(null);
    const base = `/event/${event?.code}`;

    const move = (sponsor: Sponsor, direction: 'up' | 'down') =>
        router.put(`${base}/sponsors/${sponsor.id}/move`, { direction }, { preserveScroll: true });
    const remove = (sponsor: Sponsor) => router.delete(`${base}/sponsors/${sponsor.id}`, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sponsors" />

            <h1 className="text-[2rem] leading-tight font-medium">Add/Edit Sponsors</h1>
            <p>
                Sponsors appear on the audience display when you press <strong>Show Sponsors</strong> in Match Control&apos;s Video Switch tab, in
                this order. Sponsors with the same level are shown together under it.
            </p>

            <Card>
                <CardHeader>
                    <CardTitle>New Sponsor</CardTitle>
                </CardHeader>
                <CardContent>
                    <SponsorForm sponsor={null} base={base} />
                </CardContent>
            </Card>

            {sponsors.length === 0 ? (
                <p className="text-muted-foreground">No sponsors added.</p>
            ) : (
                <table className="w-full">
                    <thead>
                        <tr className="border-b-2 text-left">
                            <th className="p-2">Logo</th>
                            <th className="p-2">Name</th>
                            <th className="p-2">Level</th>
                            <th className="p-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {sponsors.map((sponsor, index) =>
                            editingId === sponsor.id ? (
                                <tr key={sponsor.id} className="border-b">
                                    <td colSpan={4} className="p-2">
                                        <SponsorForm sponsor={sponsor} base={base} onDone={() => setEditingId(null)} />
                                    </td>
                                </tr>
                            ) : (
                                <tr key={sponsor.id} className="border-b">
                                    <td className="p-2">
                                        {sponsor.logo_url ? (
                                            <img src={sponsor.logo_url} alt="" className="h-12 max-w-40 object-contain" />
                                        ) : (
                                            <span className="text-muted-foreground">None</span>
                                        )}
                                    </td>
                                    <td className="p-2 font-medium">{sponsor.name}</td>
                                    <td className="p-2">{sponsor.level}</td>
                                    <td className="p-2">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button size="sm" variant="outline" disabled={index === 0} onClick={() => move(sponsor, 'up')}>
                                                Up
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={index === sponsors.length - 1}
                                                onClick={() => move(sponsor, 'down')}
                                            >
                                                Down
                                            </Button>
                                            <Button size="sm" variant="secondary" onClick={() => setEditingId(sponsor.id)}>
                                                Edit
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => remove(sponsor)}>
                                                Delete
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ),
                        )}
                    </tbody>
                </table>
            )}
        </AppLayout>
    );
}
