import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@inertiajs/react';
import { BarChart3, LayoutGrid, ListChecks, Monitor, Settings, Swords, Trophy, UserCheck, Users } from 'lucide-react';
import AppLogo from './app-logo';

const competitionNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'Matches',
        href: '/competition-matches',
        icon: Trophy,
    },
    {
        title: 'Referee',
        href: '/referee/scoring',
        icon: UserCheck,
    },
    {
        title: 'Match Display',
        href: '/referee/match-control',
        icon: Monitor,
    },
    {
        title: 'Ranking Display',
        href: '/referee/display',
        icon: BarChart3,
    },
    {
        title: 'Alliance Display',
        href: '/alliance-selection/display',
        icon: Users,
    },
    {
        title: 'Bracket Display',
        href: '/elimination/bracket',
        icon: Swords,
    },
    {
        title: 'Match Overlay',
        href: '/display/match-overlay',
        icon: Monitor,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Teams',
        href: '/admin/teams',
        icon: Users,
    },
    {
        title: 'Score Types',
        href: '/admin/score-types',
        icon: ListChecks,
    },
    {
        title: 'Alliance Selection',
        href: '/admin/alliance-selection',
        icon: Swords,
    },
    {
        title: 'Competition Settings',
        href: '/admin/competition-settings',
        icon: Settings,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={competitionNavItems} label="Competition" />
                <NavMain items={adminNavItems} label="Admin" />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
