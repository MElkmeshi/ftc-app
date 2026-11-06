import { TopNavPage } from '@/layouts/app/app-top-nav-layout';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

export default function EventPageLayout({ title, updatedAt, children }: { title: string; updatedAt?: Date; children: ReactNode }) {
    const event = usePage<SharedData>().props.event;

    return (
        <TopNavPage>
            <div>
                <h1 className="text-center text-[2rem] leading-tight font-medium">
                    {event?.name} {title}
                </h1>
                {updatedAt && (
                    <p className="text-muted-foreground text-center text-sm tabular-nums">Data current as of {updatedAt.toLocaleString()}</p>
                )}
            </div>
            {children}
        </TopNavPage>
    );
}
