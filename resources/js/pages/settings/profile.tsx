import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { type SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Event Admin',
    head_referee: 'Head Referee',
    referee: 'Referee',
    inspector: 'Inspector',
};

export default function Profile() {
    const { auth } = usePage<SharedData>().props;
    const roleLabel = auth.user.role ? ROLE_LABELS[auth.user.role] : undefined;

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
                        <ul className="mb-4 list-disc pl-8">{roleLabel && <li>{roleLabel}</li>}</ul>
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
