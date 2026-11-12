import AppLogoIcon from '@/components/app-logo-icon';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import { useState } from 'react';

const navLinkClass = 'flex items-center gap-1 px-2 py-2 text-white/55 hover:text-white/75 focus-visible:text-white/75 outline-none';

function EventAdminMenu({ eventCode }: { eventCode: string | null }) {
    const links = [
        ...(eventCode ? [{ title: `${eventCode} Dashboard`, href: `/event/${eventCode}/dashboard` }] : []),
        { title: 'Setup Event', href: '/events/create' },
        { title: 'Manage Games', href: '/games' },
        { title: 'Manage Users', href: '/accounts' },
    ];

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={navLinkClass}>
                Event Admin <span className="mt-0.5 border-x-[0.3em] border-t-[0.3em] border-x-transparent border-t-current" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-40 rounded-md border border-black/15 bg-white p-0 py-2 text-base shadow-none">
                {links.map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="rounded-none px-4 py-1 text-base text-[#212529] focus:bg-[#f8f9fa]">
                        <Link href={link.href}>{link.title}</Link>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function TopNavbar() {
    const { auth, event, name } = usePage<SharedData>().props;
    const [isOpen, setIsOpen] = useState(false);
    const user = auth?.user ?? null;
    const host = typeof window === 'undefined' ? '' : window.location.host;

    return (
        <nav className="border-b-[5px] border-[#ff7761] bg-[#274555] px-4 pb-2 text-base print:hidden">
            <div className="py-0.5 text-center text-[#ccc]">
                <span className="italic">{name}</span> running at {host}
            </div>
            <div className="flex flex-wrap items-center gap-x-4">
                <Link href="/" className="my-[5px] flex h-[60px] items-center gap-3 rounded-sm bg-white px-3 py-1">
                    <span className="flex size-10 items-center justify-center rounded-md bg-[#274555] text-white">
                        <AppLogoIcon className="size-6 fill-current" />
                    </span>
                    <span className="leading-tight font-extrabold text-[#274555]">
                        {name}
                        {event && <span className="block text-sm font-semibold text-[#ff7761]">{event.code}</span>}
                    </span>
                </Link>

                <button
                    type="button"
                    className="ml-auto rounded-md border border-white/10 p-2 text-white/55 lg:hidden"
                    aria-label="Toggle navigation"
                    aria-expanded={isOpen}
                    onClick={() => setIsOpen((open) => !open)}
                >
                    <Menu className="size-6" />
                </button>

                <div className={cn('w-full flex-col lg:flex lg:w-auto lg:flex-1 lg:flex-row lg:items-center', isOpen ? 'flex' : 'hidden')}>
                    {auth.can?.manageCompetition && <EventAdminMenu eventCode={event?.code ?? null} />}
                    <div className="flex flex-col lg:ml-auto lg:flex-row lg:items-center">
                        {user ? (
                            <Link href="/settings/profile" className={navLinkClass}>
                                Hello, {user.name}
                            </Link>
                        ) : (
                            <Link href="/login" className={navLinkClass}>
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
