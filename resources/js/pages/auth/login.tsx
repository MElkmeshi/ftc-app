import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

import InputError from '@/components/input-error';
import AuthLayout from '@/layouts/auth-layout';
import { bs } from '@/lib/bootstrap';

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    localSignIn: boolean;
}

export default function Login({ status, localSignIn }: LoginProps) {
    const [isPasswordShown, setIsPasswordShown] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
        remember: false,
    });

    const isDefaultUser = localSignIn && data.email.trim().toLowerCase() === 'local';

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout>
            <Head title="Login" />
            <div>
                {localSignIn && (
                    <>
                        <div className="text-center">
                            The default user has username <code className="text-[0.875em] text-[#d63384]">local</code> and no password.
                            <br />
                            &nbsp;
                        </div>
                        <div className="mx-auto w-full md:w-1/2 lg:w-1/3">
                            <Link href="/login/local" className={bs.link}>
                                Click here to select a default user.
                            </Link>
                            <br />
                            &nbsp;
                        </div>
                    </>
                )}

                <div className="mx-auto w-full md:w-1/2 lg:w-1/3">
                    {status && <div className={bs.alertSuccess}>{status}</div>}
                    <form onSubmit={submit}>
                        <div className="mb-2">
                            <label htmlFor="usernameInput" className={bs.formLabel}>
                                Username:
                            </label>
                            <input
                                id="usernameInput"
                                type={localSignIn ? 'text' : 'email'}
                                name="username"
                                className={bs.formControl}
                                placeholder="Enter username"
                                required
                                autoFocus
                                autoComplete="username"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                            />
                            <InputError message={errors.email} />
                        </div>
                        <div className="mb-2">
                            <label htmlFor="passwordInput" className={bs.formLabel}>
                                Password:
                            </label>
                            <input
                                id="passwordInput"
                                type={isPasswordShown ? 'text' : 'password'}
                                name="password"
                                className={bs.formControl}
                                placeholder="Password"
                                required={!isDefaultUser}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <div className="mt-1 flex gap-2 pl-0">
                                <input
                                    id="showPassword"
                                    type="checkbox"
                                    className={bs.formCheckInput}
                                    checked={isPasswordShown}
                                    onChange={(e) => setIsPasswordShown(e.target.checked)}
                                />
                                <label htmlFor="showPassword">Show Password</label>
                            </div>
                            <InputError message={errors.password} />
                        </div>
                        <input type="submit" className={bs.btnPrimary} value="Login" disabled={processing} />
                    </form>
                </div>
            </div>
        </AuthLayout>
    );
}
