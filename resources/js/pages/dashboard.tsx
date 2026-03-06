import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type DashboardStats } from '@/types';
import { Deferred, Head, usePage } from '@inertiajs/react';
import { Activity, CheckCircle, Trophy, Users } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

function StatsCards() {
    const { stats } = usePage<{ stats: DashboardStats }>().props;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                    <Users className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_teams ?? 0}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                    <Trophy className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.total_matches ?? 0}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.completed_matches ?? 0}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Ongoing Match</CardTitle>
                    <Activity className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                    {stats?.ongoing_match ? (
                        <div className="text-2xl font-bold text-green-600">Match #{stats.ongoing_match.number}</div>
                    ) : (
                        <div className="text-muted-foreground text-sm">None</div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                        <div className="bg-muted h-4 w-4 animate-pulse rounded" />
                    </CardHeader>
                    <CardContent>
                        <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function Dashboard() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <Deferred data="stats" fallback={<StatsSkeleton />}>
                <StatsCards />
            </Deferred>
        </AppLayout>
    );
}
