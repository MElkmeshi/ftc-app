import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type Sponsor } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

const listBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Sponsors', href: '/admin/sponsors' },
];

const formBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Sponsor List', href: '/admin/sponsors' },
    { title: 'Sponsor', href: '/admin/sponsors?view=add' },
];

const ACCEPT = '.png,.jpg,.jpeg,.webp,.svg';

const fileInput = cn(
    bs.formControl,
    'overflow-hidden p-0 file:mr-3 file:cursor-pointer file:border-0 file:border-r file:border-[#dee2e6] file:bg-[#f8f9fa] file:px-3 file:py-1.5 file:text-[#212529]',
);

function SponsorForm({ sponsor, base, listHref }: { sponsor: Sponsor | null; base: string; listHref: string }) {
    const form = useForm<{ name: string; level: string; logo: File | null }>({ name: sponsor?.name ?? '', level: sponsor?.level ?? '', logo: null });

    const submit: FormEventHandler = (submitEvent) => {
        submitEvent.preventDefault();
        form.post(sponsor ? `${base}/sponsors/${sponsor.id}` : `${base}/sponsors`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => router.get(listHref),
        });
    };

    return (
        <form onSubmit={submit} className="md:mx-auto md:w-1/2 md:px-3">
            <div className="mb-2">
                <label htmlFor="levelInput" className={bs.formLabel}>
                    Level:
                </label>
                <input
                    id="levelInput"
                    type="text"
                    className={bs.formControl}
                    placeholder="Level"
                    value={form.data.level}
                    onChange={(changeEvent) => form.setData('level', changeEvent.target.value)}
                />
                <InputError message={form.errors.level} />
            </div>
            <div className="mb-2">
                <label htmlFor="sponsorNameInput" className={bs.formLabel}>
                    Sponsor Name:
                </label>
                <input
                    id="sponsorNameInput"
                    type="text"
                    className={bs.formControl}
                    placeholder="Sponsor Name"
                    value={form.data.name}
                    onChange={(changeEvent) => form.setData('name', changeEvent.target.value)}
                />
                <InputError message={form.errors.name} />
            </div>
            <div className="mb-2">
                <label htmlFor="logoFile" className="mb-2 inline-block">
                    Logo:
                </label>
                <input
                    id="logoFile"
                    type="file"
                    accept={ACCEPT}
                    className={fileInput}
                    onChange={(changeEvent) => form.setData('logo', changeEvent.target.files?.[0] ?? null)}
                />
                <InputError message={form.errors.logo} />
            </div>
            <div>
                {sponsor?.logo_url && <img src={sponsor.logo_url} alt="" className="max-h-40 max-w-full" />}
                <br />
            </div>
            <br />
            <button type="submit" className={bs.btnPrimary} disabled={form.processing}>
                {sponsor ? 'Save Sponsor' : 'Create Sponsor'}
            </button>
        </form>
    );
}

export default function Sponsors() {
    const { props, url } = usePage<SharedData & { sponsors: Sponsor[] }>();
    const { event, sponsors } = props;
    const base = `/event/${event?.code}`;
    const listHref = `${base}/admin/sponsors`;
    const query = new URLSearchParams(url.split('?')[1] ?? '');
    const view = query.get('view');
    const editing = view === 'edit' ? (sponsors.find((sponsor) => String(sponsor.id) === query.get('sponsor')) ?? null) : null;

    const move = (sponsor: Sponsor, direction: 'up' | 'down') =>
        router.put(`${base}/sponsors/${sponsor.id}/move`, { direction }, { preserveScroll: true });
    const remove = (sponsor: Sponsor) => router.delete(`${base}/sponsors/${sponsor.id}`, { preserveScroll: true });

    if (view === 'add' || editing) {
        return (
            <AppLayout breadcrumbs={formBreadcrumbs}>
                <Head title="Sponsors" />
                <SponsorForm key={editing?.id ?? 'new'} sponsor={editing} base={base} listHref={listHref} />
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={listBreadcrumbs}>
            <Head title="Sponsors" />

            <div>
                <hr className="mt-2 mb-4 border-t border-black/25" />
                <div className={`${bs.h2} text-center`}>{event?.code} Sponsors</div>
                <table className={`${bs.table} ${bs.tableStriped} break-words [&_tbody_tr:hover>*]:bg-[rgba(0,0,0,0.075)]`}>
                    <thead>
                        <tr>
                            <th className="text-center">Level</th>
                            <th className="text-center">Name</th>
                            <th className="text-center">Logo</th>
                            <th colSpan={2} className="text-left">
                                Move
                            </th>
                            <th className="text-center" colSpan={2}>
                                <Link href={`${listHref}?view=add`} className={`${bs.btnSecondary} no-underline`}>
                                    Add
                                </Link>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {sponsors.map((sponsor, index) => (
                            <tr key={sponsor.id}>
                                <td className="text-center">{sponsor.level}</td>
                                <td className="text-center">{sponsor.name}</td>
                                <td className="text-center">
                                    {sponsor.logo_url && <img src={sponsor.logo_url} alt="" className="mx-auto h-12 max-w-40 object-contain" />}
                                </td>
                                <td>
                                    <button type="button" className={bs.btnSecondary} disabled={index === 0} onClick={() => move(sponsor, 'up')}>
                                        Up
                                    </button>
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        className={bs.btnSecondary}
                                        disabled={index === sponsors.length - 1}
                                        onClick={() => move(sponsor, 'down')}
                                    >
                                        Down
                                    </button>
                                </td>
                                <td className="text-center">
                                    <Link href={`${listHref}?view=edit&sponsor=${sponsor.id}`} className={`${bs.btnSecondary} no-underline`}>
                                        Edit
                                    </Link>
                                </td>
                                <td className="text-center">
                                    <button type="button" className={bs.btnDanger} onClick={() => remove(sponsor)}>
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
