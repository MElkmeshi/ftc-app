import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

const SECTIONS = [
    { label: 'Schedule', path: 'schedule' },
    { label: 'Rankings', path: 'rankings' },
    { label: 'Bracket', path: 'elimination/bracket' },
];

/**
 * Light pages anyone at the venue opens on a phone or prints: the schedule,
 * rankings and match scoresheets (FTC Live's public event pages). They carry
 * no session, so the chrome never depends on who is signed in.
 */
export default function EventPageLayout({ title, updatedAt, children }: { title: string; updatedAt?: Date; children: ReactNode }) {
    const { props, url } = usePage<SharedData>();
    const event = props.event;
    const base = `/event/${event?.code}`;

    return (
        <div className="bg-background text-foreground min-h-screen">
            <header className="bg-card border-b print:hidden">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                    <Link href={base} className="font-semibold">
                        {event?.name}
                    </Link>
                    <nav className="flex gap-1 text-sm">
                        {SECTIONS.map((section) => (
                            <Link
                                key={section.path}
                                href={`${base}/${section.path}`}
                                className={cn(
                                    'rounded-md px-3 py-1.5 font-medium',
                                    url.startsWith(`${base}/${section.path}`)
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-accent',
                                )}
                            >
                                {section.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-4 py-5">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                        <p className="text-muted-foreground hidden text-sm print:block">{event?.name}</p>
                        <h1 className="text-2xl font-bold">{title}</h1>
                    </div>
                    {updatedAt && <span className="text-muted-foreground text-xs tabular-nums">Updated {updatedAt.toLocaleTimeString()}</span>}
                </div>
                {children}
            </main>
        </div>
    );
}
