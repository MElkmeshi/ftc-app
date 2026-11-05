import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTeam, useDeleteTeam, useTeams, useUpdateTeam } from '@/hooks/use-teams';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Team } from '@/types';
import { Head } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/teams' },
    { title: 'Teams', href: '/admin/teams' },
];

function TeamFormDialog({ team, trigger, onClose }: { team?: Team; trigger: React.ReactNode; onClose?: () => void }) {
    const [open, setOpen] = useState(false);
    const [number, setNumber] = useState(team?.number ?? '');
    const [name, setName] = useState(team?.name ?? '');
    const [organization, setOrganization] = useState(team?.organization ?? '');
    const [city, setCity] = useState(team?.city ?? '');
    const [rookieYear, setRookieYear] = useState(team?.rookie_year ? String(team.rookie_year) : '');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const createTeam = useCreateTeam();
    const updateTeam = useUpdateTeam();
    const isPending = createTeam.isPending || updateTeam.isPending;

    const handleOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) {
            setNumber(team?.number ?? '');
            setName(team?.name ?? '');
            setOrganization(team?.organization ?? '');
            setCity(team?.city ?? '');
            setRookieYear(team?.rookie_year ? String(team.rookie_year) : '');
            setErrors({});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const data = {
            number: parseInt(String(number), 10),
            name,
            organization: organization.trim() || null,
            city: city.trim() || null,
            rookie_year: rookieYear ? parseInt(rookieYear, 10) : null,
        };
        const mutation = team ? updateTeam : createTeam;
        const mutationArg = team ? { id: team.id, data } : data;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation.mutate(mutationArg as any, {
            onSuccess: () => {
                setOpen(false);
                onClose?.();
            },
            onError: (error: { response?: { data?: { errors?: Record<string, string[]> } } }) => {
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                }
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{team ? 'Edit Team' : 'Add Team'}</DialogTitle>
                        <DialogDescription>{team ? 'Update team details.' : 'Create a new team.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="number">Team Number</Label>
                            <Input id="number" type="number" value={number} onChange={(e) => setNumber(e.target.value)} required />
                            {errors.number && <p className="text-sm text-red-500">{errors.number[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Team Name</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                            {errors.name && <p className="text-sm text-red-500">{errors.name[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="organization">School or organization</Label>
                            <Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} />
                            {errors.organization && <p className="text-sm text-red-500">{errors.organization[0]}</p>}
                        </div>
                        <div className="grid grid-cols-[1fr_8rem] gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="city">City</Label>
                                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                                {errors.city && <p className="text-sm text-red-500">{errors.city[0]}</p>}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rookie_year">Rookie year</Label>
                                <Input id="rookie_year" type="number" value={rookieYear} onChange={(e) => setRookieYear(e.target.value)} />
                                {errors.rookie_year && <p className="text-sm text-red-500">{errors.rookie_year[0]}</p>}
                            </div>
                        </div>
                        <p className="text-muted-foreground text-xs">Optional. Shown on the announcer sheet and team placards.</p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? 'Saving...' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteTeamDialog({ team }: { team: Team }) {
    const [open, setOpen] = useState(false);
    const deleteTeam = useDeleteTeam();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Team</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete team #{team.number} "{team.name}"? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleteTeam.isPending}
                        onClick={() => {
                            deleteTeam.mutate(team.id, {
                                onSuccess: () => setOpen(false),
                            });
                        }}
                    >
                        {deleteTeam.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function TeamsPage() {
    const { data: teams = [], isLoading } = useTeams();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Teams" />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Teams</CardTitle>
                    <TeamFormDialog
                        trigger={
                            <Button size="sm">
                                <Plus className="mr-1 h-4 w-4" />
                                Add Team
                            </Button>
                        }
                    />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="border-b">
                                        <th className="px-4 py-2 text-left font-medium">Number</th>
                                        <th className="px-4 py-2 text-left font-medium">Name</th>
                                        <th className="px-4 py-2 text-left font-medium">From</th>
                                        <th className="px-4 py-2 text-left font-medium">Rookie year</th>
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                                                No teams found
                                            </td>
                                        </tr>
                                    ) : (
                                        teams.map((team) => (
                                            <tr key={team.id} className="hover:bg-muted/50 border-b">
                                                <td className="px-4 py-2 font-medium">{team.number}</td>
                                                <td className="px-4 py-2">{team.name}</td>
                                                <td className="text-muted-foreground px-4 py-2 text-sm">
                                                    {[team.organization, team.city].filter(Boolean).join(' · ')}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-2 text-sm">{team.rookie_year ?? ''}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex justify-end gap-2">
                                                        <TeamFormDialog
                                                            team={team}
                                                            trigger={
                                                                <Button size="sm" variant="outline">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            }
                                                        />
                                                        <DeleteTeamDialog team={team} />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </AppLayout>
    );
}
