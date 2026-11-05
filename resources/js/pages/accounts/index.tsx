import InputError from '@/components/input-error';
import { ServerAddressField } from '@/components/server-address-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useServerAddress } from '@/hooks/use-server-address';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Copy, KeyRound, Printer, Trash2, UserPlus, Wand2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { type FormEventHandler, useState } from 'react';

type RoleValue = 'admin' | 'head_referee' | 'referee' | 'inspector' | 'viewer';

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

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Accounts', href: '/accounts' }];

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

/**
 * Shows passwords that were just generated, each with a QR code that signs
 * the official in when scanned. They are never shown again, so offer copy and
 * print.
 */
function NewCredentials({ credentials, validForDays }: { credentials: Credential[]; validForDays: number }) {
    const { address, setAddress, reset } = useServerAddress();
    const copyAll = () => {
        void navigator.clipboard?.writeText(credentials.map((c) => `${c.name}\t${c.email}\t${c.password}`).join('\n'));
    };

    return (
        <Card className="border-amber-500/50 bg-amber-500/5 print:border-0 print:shadow-none">
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
                <div>
                    <CardTitle>New sign-in details</CardTitle>
                    <p className="text-muted-foreground text-sm print:hidden">
                        Print these now: passwords are only shown once. Officials can scan their code to sign in. Each code works for {validForDays}{' '}
                        days, or until that password is changed.
                    </p>
                    <p className="hidden text-sm print:block">
                        Scan your code with a phone or tablet camera to sign in, or go to {address} and type the password.
                    </p>
                </div>
                <div className="flex gap-2 print:hidden">
                    <Button variant="outline" size="sm" onClick={copyAll}>
                        <Copy className="mr-1 size-4" /> Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                        <Printer className="mr-1 size-4" /> Print
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="print:hidden">
                    <ServerAddressField address={address} onChange={setAddress} onReset={reset} />
                </div>
                <table className="w-full text-sm">
                    <thead className="text-muted-foreground text-left">
                        <tr>
                            <th className="py-1 font-medium">Name</th>
                            <th className="py-1 font-medium">Role</th>
                            <th className="py-1 font-medium">Email</th>
                            <th className="py-1 font-medium">Password</th>
                            <th className="py-1 text-right font-medium">Sign-in code</th>
                        </tr>
                    </thead>
                    <tbody>
                        {credentials.map((credential) => (
                            <tr key={credential.email} className="border-t">
                                <td className="py-1.5">{credential.name}</td>
                                <td className="py-1.5">{credential.role}</td>
                                <td className="py-1.5 font-mono">{credential.email}</td>
                                <td className="py-1.5 font-mono font-semibold">{credential.password}</td>
                                <td className="py-1.5">
                                    <QRCodeSVG
                                        value={`${address}${credential.sign_in_link}`}
                                        size={88}
                                        marginSize={1}
                                        className="ml-auto break-inside-avoid"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
}

function GenerateOfficials() {
    const { data, setData, post, processing, errors } = useForm({ head_referees: 1, referees: 4, inspectors: 0 });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/accounts/generate', { preserveScroll: true });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wand2 className="size-4" /> Generate official logins
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                    Creates numbered accounts such as <code className="font-mono">referee1@officials.local</code>, one per tablet.
                </p>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="flex flex-wrap items-end gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="head_referees">Head referees</Label>
                        <Input
                            id="head_referees"
                            type="number"
                            min={0}
                            max={4}
                            className="w-24"
                            value={data.head_referees}
                            onChange={(e) => setData('head_referees', Number(e.target.value))}
                        />
                        <InputError message={errors.head_referees} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="referees">Referees</Label>
                        <Input
                            id="referees"
                            type="number"
                            min={0}
                            max={16}
                            className="w-24"
                            value={data.referees}
                            onChange={(e) => setData('referees', Number(e.target.value))}
                        />
                        <InputError message={errors.referees} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="inspectors">Inspectors</Label>
                        <Input
                            id="inspectors"
                            type="number"
                            min={0}
                            max={8}
                            className="w-24"
                            value={data.inspectors}
                            onChange={(e) => setData('inspectors', Number(e.target.value))}
                        />
                        <InputError message={errors.inspectors} />
                    </div>
                    <Button type="submit" disabled={processing || data.head_referees + data.referees + data.inspectors === 0}>
                        Generate
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function AddAccount({ roles }: { roles: RoleOption[] }) {
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
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UserPlus className="size-4" /> Add a person
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                        <Label htmlFor="new_name">Name</Label>
                        <Input id="new_name" value={data.name} onChange={(e) => setData('name', e.target.value)} />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="new_email">Email</Label>
                        <Input id="new_email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                        <InputError message={errors.email} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="new_role">Role</Label>
                        <select
                            id="new_role"
                            className={selectClassName}
                            value={data.role}
                            onChange={(e) => setData('role', e.target.value as RoleValue)}
                        >
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.label}
                                </option>
                            ))}
                        </select>
                        <p className="text-muted-foreground text-xs">{roles.find((role) => role.value === data.role)?.description}</p>
                    </div>
                    <div className="flex items-start justify-end sm:pt-6">
                        <Button type="submit" disabled={processing}>
                            Add account
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
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
        <tr className="border-t">
            <td className="px-6 py-2">
                <div className="font-medium">
                    {account.name} {isSelf && <Badge variant="secondary">You</Badge>}
                </div>
                <div className="text-muted-foreground font-mono text-xs">{account.email}</div>
            </td>
            <td className="px-2 py-2">
                <select
                    aria-label={`Role for ${account.name}`}
                    className={selectClassName}
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
                <InputError message={error ?? undefined} />
            </td>
            <td className="px-6 py-2">
                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.post(`/accounts/${account.id}/reset-password`, {}, { preserveScroll: true })}
                    >
                        <KeyRound className="mr-1 size-4" /> New password
                    </Button>
                    {!isSelf &&
                        (confirmingDelete ? (
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => router.delete(`/accounts/${account.id}`, { preserveScroll: true })}
                            >
                                Confirm delete
                            </Button>
                        ) : (
                            <Button variant="ghost" size="sm" aria-label={`Delete ${account.name}`} onClick={() => setConfirmingDelete(true)}>
                                <Trash2 className="size-4" />
                            </Button>
                        ))}
                </div>
            </td>
        </tr>
    );
}

export default function Accounts() {
    const page = usePage<AccountsProps>();
    const { accounts, roles, auth, signInLinkDays } = page.props;
    const credentials = (page.flash as { credentials?: Credential[] }).credentials ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounts" />

            <div className="space-y-6 p-4">
                <div className="print:hidden">
                    <h1 className="text-2xl font-bold">Accounts</h1>
                    <p className="text-muted-foreground">Sign-in accounts are shared by every event on this server.</p>
                </div>

                {credentials.length > 0 && <NewCredentials credentials={credentials} validForDays={signInLinkDays} />}

                <div className="grid gap-6 lg:grid-cols-2 print:hidden">
                    <GenerateOfficials />
                    <AddAccount roles={roles} />
                </div>

                <Card className="print:hidden">
                    <CardHeader>
                        <CardTitle>
                            {accounts.length} account{accounts.length === 1 ? '' : 's'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto p-0">
                        <table className="w-full text-sm">
                            <tbody>
                                {accounts.map((account) => (
                                    <AccountRow key={account.id} account={account} roles={roles} isSelf={account.id === auth.user.id} />
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
