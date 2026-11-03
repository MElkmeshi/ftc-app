import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    BarChart3,
    CalendarRange,
    ClipboardCheck,
    Home,
    ListChecks,
    Monitor,
    MonitorPlay,
    Settings,
    Swords,
    Trophy,
    UserCheck,
    Users,
} from 'lucide-react';
import AppLogo from './app-logo';

const runEventNavItems: NavItem[] = [
    { title: 'Event Dashboard', href: '/dashboard', icon: ClipboardCheck },
    { title: 'Match Control', href: '/referee/match-control', icon: MonitorPlay },
    { title: 'Referee Scoring', href: '/referee/scoring', icon: UserCheck },
    { title: 'Schedule & Results', href: '/competition-matches', icon: Trophy },
    { title: 'Event Home', href: '/', icon: Home },
];

const displayNavItems: NavItem[] = [
    { title: 'Match Overlay', href: '/display/match-overlay', icon: Monitor },
    { title: 'Rankings', href: '/referee/display', icon: BarChart3 },
    { title: 'Alliance Selection', href: '/alliance-selection/display', icon: Users },
    { title: 'Bracket', href: '/elimination/bracket', icon: Swords },
];

const setupNavItems: NavItem[] = [
    { title: 'Teams', href: '/admin/teams', icon: Users },
    { title: 'Score Types', href: '/admin/score-types', icon: ListChecks },
    { title: 'Alliance Selection', href: '/admin/alliance-selection', icon: Swords },
    { title: 'Match Timing', href: '/admin/competition-settings', icon: Settings },
];

const serverNavItems: NavItem[] = [{ title: 'All Events', href: '/events', icon: CalendarRange }];

export function AppSidebar() {
    const { event } = usePage<SharedData>().props;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={event ? `/event/${event.code}/dashboard` : '/'} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                {event && (
                    <div className="truncate px-2 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                        <span className="font-mono text-sidebar-foreground/50">{event.code}</span> · {event.name}
                    </div>
                )}
            </SidebarHeader>

            <SidebarContent>
                {event ? (
                    <>
                        <NavMain items={runEventNavItems} label="Run Event" />
                        <NavMain items={displayNavItems} label="Displays" />
                        <NavMain items={setupNavItems} label="Setup" />
                    </>
                ) : null}
                <NavMain items={serverNavItems} label="Server" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
