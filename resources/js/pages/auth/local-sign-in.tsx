import AuthLayout from '@/layouts/auth-layout';
import { bs } from '@/lib/bootstrap';
import { Head, useForm } from '@inertiajs/react';
import { type FormEventHandler } from 'react';

interface RoleOption {
    value: string;
    label: string;
    description: string;
}

export default function LocalSignIn({ roles }: { roles: RoleOption[] }) {
    const form = useForm({ role: roles[0]?.value ?? '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        form.post('/login/local');
    };

    return (
        <AuthLayout>
            <Head title="Login" />
            <div className="mx-auto w-full md:w-1/2 lg:w-1/3">
                <form onSubmit={submit}>
                    <div className="mb-2">
                        <label htmlFor="eventAccts" className={bs.formLabel}>
                            Username:
                        </label>
                        <select
                            id="eventAccts"
                            name="username"
                            className={bs.formSelect}
                            value={form.data.role}
                            onChange={(e) => form.setData('role', e.target.value)}
                        >
                            {roles.map((role) => (
                                <option key={role.value} value={role.value}>
                                    {role.value === 'admin' ? 'local' : `local ${role.label}`}
                                </option>
                            ))}
                        </select>
                        {form.errors.role && <p className="mt-1 text-sm text-[#dc3545]">{form.errors.role}</p>}
                    </div>
                    <input type="submit" className={bs.btnPrimary} value="Login" disabled={form.processing} />
                </form>
            </div>
        </AuthLayout>
    );
}
