import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';

export default function Profile() {
    const { auth } = usePage<SharedData>().props;

    return (
        <PublicLayout>
            <Head title={`Hello, ${auth.user.name}`} />

            <div>
                <div className="lg:w-1/3">
                    <h4 className={bs.h4}>Hello, {auth.user.name}</h4>
                    <br />
                </div>
                <div className="flex flex-wrap">
                    <div className="w-full lg:w-1/3">
                        <h4 className={bs.h4}>Roles:</h4>
                    </div>
                    <div className="w-full lg:w-2/3">
                        <ul className="mb-4 list-disc pl-8">{auth.role && <li>{auth.role}</li>}</ul>
                    </div>
                    <div className="mx-auto w-full md:w-2/3 lg:w-1/2">
                        <Link href={route('logout')} method="post" as="button" className={`${bs.btnDanger} w-full`} onClick={() => router.flushAll()}>
                            Logout
                        </Link>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
