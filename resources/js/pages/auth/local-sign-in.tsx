import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';

interface RoleOption {
    value: string;
    label: string;
    description: string;
}

export default function LocalSignIn({ roles }: { roles: RoleOption[] }) {
    const form = useForm({ role: '' });

    const signInAs = (role: string) => {
        form.transform(() => ({ role }));
        form.post('/login/local');
    };

    return (
        <AuthLayout title="Select a Default User" description="Sign this device in without a password.">
            <Head title="Default Users" />
            <div className="grid gap-2">
                {roles.map((role) => (
                    <button
                        key={role.value}
                        type="button"
                        disabled={form.processing}
                        onClick={() => signInAs(role.value)}
                        className="rounded-md border border-[#0d6efd] px-3 py-2 text-left text-[#0d6efd] hover:bg-[#0d6efd] hover:text-white disabled:opacity-65"
                    >
                        <span className="block font-medium">{role.value === 'admin' ? 'local' : `local ${role.label}`}</span>
                        <span className="block text-sm opacity-80">
                            {role.label}: {role.description}
                        </span>
                    </button>
                ))}
            </div>
            {form.errors.role && <p className="mt-2 text-[#dc3545]">{form.errors.role}</p>}
            <p className="mt-4">
                <Link href="/login" className="text-[#0d6efd] underline">
                    Back to Login
                </Link>
            </p>
        </AuthLayout>
    );
}
