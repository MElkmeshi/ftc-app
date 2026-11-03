import AppLogoIcon from '@/components/app-logo-icon';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { type ReactNode } from 'react';

/**
 * Light chrome for pages anyone at the venue can open without signing in:
 * the event list and each event's home page (FTC Live's public pages).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    const { auth, event, name } = usePage<SharedData>().props;

    return (
        <div className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-5 fill-current" />
                        </span>
                        <span>{name}</span>
                    </Link>
                    <nav className="flex items-center gap-4 text-sm">
                        <Link href="/" className="text-muted-foreground hover:text-foreground">
                            All events
                        </Link>
                        {auth.user ? (
                            <Link
                                href={event ? `/event/${event.code}/dashboard` : '/settings/profile'}
                                className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {event ? 'Event dashboard' : auth.user.name}
                            </Link>
                        ) : (
                            <Link href="/login" className="rounded-md border px-3 py-1.5 font-medium hover:bg-accent">
                                Sign in
                            </Link>
                        )}
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        </div>
    );
}
