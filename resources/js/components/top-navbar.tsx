import AppLogoIcon from '@/components/app-logo-icon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { ADMIN_SERVER_MENU, EVENT_ADMIN_MENU, SERVER_MENU } from '@/lib/event-menu';
import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, Menu } from 'lucide-react';
import { Fragment, useState } from 'react';

const navLinkClass = 'flex items-center gap-1 px-2 py-2 text-white/55 hover:text-white/75 focus-visible:text-white/75 outline-none';

function EventAdminMenu({ eventCode, isAdmin }: { eventCode: string | null; isAdmin: boolean }) {
    const base = eventCode ? `/event/${eventCode}` : '';

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger className={navLinkClass}>
                Event Admin <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-[80vh] min-w-60 overflow-y-auto rounded-md">
                {eventCode &&
                    EVENT_ADMIN_MENU.map((group) => (
                        <Fragment key={group.title}>
                            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal uppercase">{group.title}</DropdownMenuLabel>
                            {group.links.map((link) => (
                                <DropdownMenuItem key={link.href} asChild>
                                    <Link href={`${base}${link.href}`}>{link.title}</Link>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                        </Fragment>
                    ))}
                {[...SERVER_MENU, ...(isAdmin ? ADMIN_SERVER_MENU : [])].map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
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
            <div className="py-1.5 text-center text-white/90">
                <span className="italic">{name}</span> running at {host}
            </div>
            <div className="flex flex-wrap items-center gap-x-4">
                <Link href={event ? `/event/${event.code}` : '/'} className="flex h-[60px] items-center gap-3 rounded-sm bg-white px-3 py-1">
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
                    {user && <EventAdminMenu eventCode={event?.code ?? null} isAdmin={user.role === 'admin'} />}
                    <div className="flex flex-col lg:ml-auto lg:flex-row lg:items-center">
                        {event && (
                            <Link href={`/event/${event.code}`} className={navLinkClass}>
                                Event Home
                            </Link>
                        )}
                        <Link href="/" className={navLinkClass}>
                            All Events
                        </Link>
                        {user ? (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger className={navLinkClass}>Hello, {user.name}</DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-56 rounded-md">
                                    <UserMenuContent user={user} />
                                </DropdownMenuContent>
                            </DropdownMenu>
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
