import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type DashboardStats } from '@/types';
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CheckCircle, Trophy, Users } from 'lucide-react';
import { useApi } from '@/hooks/use-api';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

export default function Dashboard() {
    const api = useApi();
    const { data: stats, isLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats'],
        queryFn: api.getDashboardStats,
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
                        <Users className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                        ) : (
                            <div className="text-2xl font-bold">{stats?.total_teams ?? 0}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
                        <Trophy className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                        ) : (
                            <div className="text-2xl font-bold">{stats?.total_matches ?? 0}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                        ) : (
                            <div className="text-2xl font-bold">{stats?.completed_matches ?? 0}</div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Ongoing Match</CardTitle>
                        <Activity className="text-muted-foreground h-4 w-4" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="bg-muted h-8 w-16 animate-pulse rounded" />
                        ) : stats?.ongoing_match ? (
                            <div className="text-2xl font-bold text-green-600">Match #{stats.ongoing_match.number}</div>
                        ) : (
                            <div className="text-muted-foreground text-sm">None</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
