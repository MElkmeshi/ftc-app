import InputError from '@/components/input-error';
import { ServerAddressField } from '@/components/server-address-field';
import { useServerAddress } from '@/hooks/use-server-address';
import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type SharedData, type UserRoleValue } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { type FormEventHandler, useState } from 'react';

type RoleValue = UserRoleValue;

interface Account {
    id: number;
    name: string;
    email: string;
    role: RoleValue;
}

interface RoleOption {
    value: RoleValue;
    label: string;
    description: string;
}

interface Credential {
    name: string;
    email: string;
    role: string;
    password: string;
    sign_in_link: string;
}

interface AccountsProps extends SharedData {
    accounts: Account[];
    roles: RoleOption[];
    signInLinkDays: number;
}

const listBreadcrumbs: BreadcrumbItem[] = [{ title: 'Accounts', href: '/accounts' }];

const defaultAccountsBreadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounts', href: '/accounts' },
    { title: 'Default Accounts', href: '/accounts?view=default' },
];

const countInput = 'w-[5em] rounded-sm border border-[#767676] bg-white px-1 py-px';

function CredentialsTable({ credentials, validForDays, title }: { credentials: Credential[]; validForDays: number; title: string }) {
    const { address, setAddress, reset } = useServerAddress();
    const [showQrCodes, setShowQrCodes] = useState(false);

    return (
        <div>
            <div className="relative">
                <h2 className={`${bs.h2} text-center`}>{title}</h2>
                <button type="button" className={`${bs.btnLight} absolute top-0 right-0 print:hidden`} title="Print" onClick={() => window.print()}>
                    <Printer className="inline size-8" />
                </button>
            </div>
            <div className="print:hidden">
                Print these now: passwords are only shown once. Each QR code works for {validForDays} days, or until that password is changed.
            </div>
            <div className="hidden print:block">
                Scan your code with a phone or tablet camera to sign in, or go to {address} and type the password.
            </div>
            <div className="text-center print:hidden">
                <label>
                    <input type="checkbox" checked={showQrCodes} onChange={(e) => setShowQrCodes(e.target.checked)} />
                    Show QR Codes
                </label>
            </div>
            {showQrCodes && (
                <div className="mb-2 print:hidden">
                    <ServerAddressField address={address} onChange={setAddress} onReset={reset} />
                </div>
            )}
            <table className={`${bs.table} ${bs.tableStriped} text-center`}>
                <tbody>
                    <tr>
                        <th>Username</th>
                        <th>Password</th>
                        {showQrCodes && <th>QR Code</th>}
                    </tr>
                    {credentials.map((credential) => (
                        <tr key={credential.email}>
                            <td>{credential.email}</td>
                            <td>{credential.password}</td>
                            {showQrCodes && (
                                <td>
                                    <QRCodeSVG
                                        value={`${address}${credential.sign_in_link}`}
                                        size={88}
                                        marginSize={1}
                                        className="mx-auto break-inside-avoid"
                                    />
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function GenerateOfficials() {
    const { data, setData, post, processing, errors } = useForm({ head_referees: 1, referees: 4, inspectors: 0 });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/accounts/generate', { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
            <button type="submit" className={bs.btnPrimary} disabled={processing || data.head_referees + data.referees + data.inspectors === 0}>
                Generate New Random Accounts
            </button>
            <label>
                Head Referees:&nbsp;
                <input
                    id="head_referees"
                    type="number"
                    min={0}
                    max={4}
                    className={countInput}
                    value={data.head_referees}
                    onChange={(e) => setData('head_referees', Number(e.target.value))}
                />
            </label>
            <label>
                Referees:&nbsp;
                <input
                    id="referees"
                    type="number"
                    min={0}
                    max={16}
                    className={countInput}
                    value={data.referees}
                    onChange={(e) => setData('referees', Number(e.target.value))}
                />
            </label>
            <label>
                Inspectors:&nbsp;
                <input
                    id="inspectors"
                    type="number"
                    min={0}
                    max={8}
                    className={countInput}
                    value={data.inspectors}
                    onChange={(e) => setData('inspectors', Number(e.target.value))}
                />
            </label>
            <InputError message={errors.head_referees ?? errors.referees ?? errors.inspectors} />
        </form>
    );
}

function CreateAccount({ roles }: { roles: RoleOption[] }) {
    const { data, setData, post, processing, errors, reset } = useForm<{ name: string; email: string; role: RoleValue }>({
        name: '',
        email: '',
        role: 'referee',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/accounts', { preserveScroll: true, onSuccess: () => reset() });
    };

    return (
        <form onSubmit={submit} className="md:mx-auto md:w-10/12 md:px-3 print:hidden">
            <div className="mb-4">
                <label htmlFor="new_name" className={bs.formLabel}>
                    Name:
                </label>
                <input
                    id="new_name"
                    type="text"
                    className={bs.formControl}
                    placeholder="Enter name"
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                />
                <InputError message={errors.name} />
            </div>
            <div className="mb-4">
                <label htmlFor="new_email" className={bs.formLabel}>
                    Email:
                </label>
                <input
                    id="new_email"
                    type="email"
                    className={bs.formControl}
                    placeholder="Enter email"
                    value={data.email}
                    onChange={(e) => setData('email', e.target.value)}
                />
                <InputError message={errors.email} />
            </div>
            <div>
                <label>Roles:</label>
                <br />
                <small className="text-[0.875em]">{roles.find((role) => role.value === data.role)?.description}</small>
            </div>
            <table className={bs.table}>
                <tbody>
                    <tr>
                        <td>Event</td>
                        {roles.map((role) => (
                            <td key={role.value}>
                                <label htmlFor={`role_${role.value}`}>{role.label}</label>
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td>All Events</td>
                        {roles.map((role) => (
                            <td key={role.value}>
                                <input
                                    id={`role_${role.value}`}
                                    type="checkbox"
                                    className={bs.formCheckInput}
                                    checked={data.role === role.value}
                                    onChange={() => setData('role', role.value)}
                                />
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
            <InputError message={errors.role} />
            <br />
            <button type="submit" className={bs.btnPrimary} disabled={processing}>
                Create Account
            </button>
        </form>
    );
}

function AccountRow({ account, roles, isSelf }: { account: Account; roles: RoleOption[]; isSelf: boolean }) {
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const changeRole = (role: RoleValue) => {
        router.put(
            `/accounts/${account.id}`,
            { name: account.name, email: account.email, role },
            { preserveScroll: true, onError: (errors) => setError(errors.role ?? null) },
        );
    };

    return (
        <tr>
            <td className="w-1/2">
                {account.name}
                <br />
                {account.email}
            </td>
            <td className="w-1/2">
                <div className="flex flex-wrap items-center justify-center gap-2">
                    <select
                        aria-label={`Role for ${account.name}`}
                        className={cn(bs.formSelect, 'w-auto disabled:bg-[#e9ecef]')}
                        value={account.role}
                        disabled={isSelf}
                        onChange={(e) => changeRole(e.target.value as RoleValue)}
                    >
                        {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className={bs.btnSecondary}
                        onClick={() => router.post(`/accounts/${account.id}/reset-password`, {}, { preserveScroll: true })}
                    >
                        Reset Password
                    </button>
                    {!isSelf &&
                        (confirmingDelete ? (
                            <button
                                type="button"
                                className={bs.btnDanger}
                                onClick={() => router.delete(`/accounts/${account.id}`, { preserveScroll: true })}
                            >
                                Confirm Delete
                            </button>
                        ) : (
                            <button type="button" className={bs.btnDanger} onClick={() => setConfirmingDelete(true)}>
                                Delete
                            </button>
                        ))}
                </div>
                <InputError message={error ?? undefined} />
            </td>
        </tr>
    );
}

export default function Accounts() {
    const page = usePage<AccountsProps>();
    const { accounts, roles, auth, signInLinkDays } = page.props;
    const credentials = (page.flash as { credentials?: Credential[] }).credentials ?? [];
    const view = new URLSearchParams(page.url.split('?')[1] ?? '').get('view');

    if (view === 'default') {
        return (
            <AppLayout breadcrumbs={defaultAccountsBreadcrumbs}>
                <Head title="Default Accounts" />

                <div>
                    <GenerateOfficials />
                    <CredentialsTable credentials={credentials} validForDays={signInLinkDays} title="Default Accounts" />
                </div>
            </AppLayout>
        );
    }

    if (view === 'create') {
        return (
            <AppLayout breadcrumbs={listBreadcrumbs}>
                <Head title="Create Account" />

                <div>
                    {credentials.length > 0 && <CredentialsTable credentials={credentials} validForDays={signInLinkDays} title="Accounts" />}
                    <CreateAccount roles={roles} />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={listBreadcrumbs}>
            <Head title="Accounts" />

            <div>
                {credentials.length > 0 && <CredentialsTable credentials={credentials} validForDays={signInLinkDays} title="Accounts" />}
                <div className="print:hidden">
                    {credentials.length === 0 && <h2 className={`${bs.h2} text-center`}>Accounts</h2>}
                    <table className={`${bs.table} ${bs.tableStriped} text-center`}>
                        <tbody>
                            <tr>
                                <th className="w-1/2">Username</th>
                                <th className="w-1/2">
                                    <span className="mr-4">Manage</span>
                                    <Link href="/accounts?view=create" className={`${bs.btnSecondary} font-normal no-underline`}>
                                        Create Account
                                    </Link>{' '}
                                    <Link href="/accounts?view=default" className={`${bs.btnSecondary} font-normal no-underline`}>
                                        Default Accounts
                                    </Link>
                                </th>
                            </tr>
                            {accounts.map((account) => (
                                <AccountRow key={account.id} account={account} roles={roles} isSelf={account.id === auth.user.id} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
