import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateGroup, useDeleteGroup, useGroups, useUpdateGroup } from '@/hooks/use-groups';
import { useScoreTypes } from '@/hooks/use-match';
import { useCreateScoreType, useDeleteScoreType, useUpdateScoreType } from '@/hooks/use-score-types-crud';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type Group, type ScoreType } from '@/types';
import { Head } from '@inertiajs/react';
import { Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/score-types' },
    { title: 'Score Types', href: '/admin/score-types' },
];

function ScoreTypeFormDialog({
    scoreType,
    groups,
    trigger,
}: {
    scoreType?: ScoreType;
    groups: Group[];
    trigger: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(scoreType?.name ?? '');
    const [points, setPoints] = useState(String(scoreType?.points ?? ''));
    const [target, setTarget] = useState(scoreType?.target ?? 'team');
    const [groupId, setGroupId] = useState<string>(scoreType?.group_id ? String(scoreType.group_id) : 'none');
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const createScoreType = useCreateScoreType();
    const updateScoreType = useUpdateScoreType();
    const isPending = createScoreType.isPending || updateScoreType.isPending;

    const handleOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) {
            setName(scoreType?.name ?? '');
            setPoints(String(scoreType?.points ?? ''));
            setTarget(scoreType?.target ?? 'team');
            setGroupId(scoreType?.group_id ? String(scoreType.group_id) : 'none');
            setErrors({});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const data = {
            name,
            points: parseInt(points, 10),
            target,
            group_id: groupId === 'none' ? null : parseInt(groupId, 10),
        };

        const onSuccess = () => setOpen(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onError = (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        };

        if (scoreType) {
            updateScoreType.mutate({ id: scoreType.id, data }, { onSuccess, onError });
        } else {
            createScoreType.mutate(data, { onSuccess, onError });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{scoreType ? 'Edit Score Type' : 'Add Score Type'}</DialogTitle>
                        <DialogDescription>{scoreType ? 'Update score type details.' : 'Create a new score type.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="st-name">Name</Label>
                            <Input id="st-name" value={name} onChange={(e) => setName(e.target.value)} required />
                            {errors.name && <p className="text-sm text-red-500">{errors.name[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="st-points">Points</Label>
                            <Input id="st-points" type="number" value={points} onChange={(e) => setPoints(e.target.value)} required />
                            {errors.points && <p className="text-sm text-red-500">{errors.points[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Target</Label>
                            <Select value={target} onValueChange={setTarget}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="team">Team</SelectItem>
                                    <SelectItem value="alliance">Alliance</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.target && <p className="text-sm text-red-500">{errors.target[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>Group</Label>
                            <Select value={groupId} onValueChange={setGroupId}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Group</SelectItem>
                                    {groups.map((g) => (
                                        <SelectItem key={g.id} value={String(g.id)}>
                                            {g.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.group_id && <p className="text-sm text-red-500">{errors.group_id[0]}</p>}
                        </div>
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

function DeleteScoreTypeDialog({ scoreType }: { scoreType: ScoreType }) {
    const [open, setOpen] = useState(false);
    const deleteScoreType = useDeleteScoreType();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Score Type</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete "{scoreType.name}"? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleteScoreType.isPending}
                        onClick={() => {
                            deleteScoreType.mutate(scoreType.id, {
                                onSuccess: () => setOpen(false),
                            });
                        }}
                    >
                        {deleteScoreType.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GroupFormDialog({
    group,
    trigger,
}: {
    group?: Group;
    trigger: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState(group?.name ?? '');
    const [description, setDescription] = useState(group?.description ?? '');
    const [displayOrder, setDisplayOrder] = useState(String(group?.display_order ?? '1'));
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const createGroup = useCreateGroup();
    const updateGroup = useUpdateGroup();
    const isPending = createGroup.isPending || updateGroup.isPending;

    const handleOpenChange = (value: boolean) => {
        setOpen(value);
        if (value) {
            setName(group?.name ?? '');
            setDescription(group?.description ?? '');
            setDisplayOrder(String(group?.display_order ?? '1'));
            setErrors({});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const data = {
            name,
            description: description || null,
            display_order: parseInt(displayOrder, 10),
        };

        const onSuccess = () => setOpen(false);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onError = (error: any) => {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            }
        };

        if (group) {
            updateGroup.mutate({ id: group.id, data }, { onSuccess, onError });
        } else {
            createGroup.mutate(data, { onSuccess, onError });
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{group ? 'Edit Group' : 'Add Group'}</DialogTitle>
                        <DialogDescription>{group ? 'Update group details.' : 'Create a new group.'}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="g-name">Name</Label>
                            <Input id="g-name" value={name} onChange={(e) => setName(e.target.value)} required />
                            {errors.name && <p className="text-sm text-red-500">{errors.name[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="g-desc">Description</Label>
                            <Input id="g-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
                            {errors.description && <p className="text-sm text-red-500">{errors.description[0]}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="g-order">Display Order</Label>
                            <Input
                                id="g-order"
                                type="number"
                                value={displayOrder}
                                onChange={(e) => setDisplayOrder(e.target.value)}
                                required
                            />
                            {errors.display_order && <p className="text-sm text-red-500">{errors.display_order[0]}</p>}
                        </div>
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

function DeleteGroupDialog({ group }: { group: Group }) {
    const [open, setOpen] = useState(false);
    const deleteGroup = useDeleteGroup();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950">
                    <Trash2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Group</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete "{group.name}"? Score types in this group will be ungrouped.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        disabled={deleteGroup.isPending}
                        onClick={() => {
                            deleteGroup.mutate(group.id, {
                                onSuccess: () => setOpen(false),
                            });
                        }}
                    >
                        {deleteGroup.isPending ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function ManageGroupsDialog() {
    const [open, setOpen] = useState(false);
    const { data: groups = [] } = useGroups();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <Settings2 className="mr-1 h-4 w-4" />
                    Manage Groups
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Groups</DialogTitle>
                    <DialogDescription>Organize score types into groups.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4">
                    {groups.length === 0 ? (
                        <p className="text-muted-foreground text-center text-sm">No groups yet.</p>
                    ) : (
                        groups.map((group) => (
                            <div key={group.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                                <div>
                                    <p className="font-medium">{group.name}</p>
                                    {group.description && <p className="text-muted-foreground text-sm">{group.description}</p>}
                                </div>
                                <div className="flex gap-2">
                                    <GroupFormDialog
                                        group={group}
                                        trigger={
                                            <Button size="sm" variant="outline">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        }
                                    />
                                    <DeleteGroupDialog group={group} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <DialogFooter>
                    <GroupFormDialog
                        trigger={
                            <Button size="sm">
                                <Plus className="mr-1 h-4 w-4" />
                                Add Group
                            </Button>
                        }
                    />
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function ScoreTypesPage() {
    const { data: scoreTypes = [], isLoading } = useScoreTypes();
    const { data: groups = [] } = useGroups();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Score Types" />

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Score Types</CardTitle>
                    <div className="flex gap-2">
                        <ManageGroupsDialog />
                        <ScoreTypeFormDialog
                            groups={groups}
                            trigger={
                                <Button size="sm">
                                    <Plus className="mr-1 h-4 w-4" />
                                    Add Score Type
                                </Button>
                            }
                        />
                    </div>
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
                                        <th className="px-4 py-2 text-left font-medium">Name</th>
                                        <th className="px-4 py-2 text-left font-medium">Points</th>
                                        <th className="px-4 py-2 text-left font-medium">Target</th>
                                        <th className="px-4 py-2 text-left font-medium">Group</th>
                                        <th className="px-4 py-2 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scoreTypes.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">
                                                No score types found
                                            </td>
                                        </tr>
                                    ) : (
                                        scoreTypes.map((st) => (
                                            <tr key={st.id} className="hover:bg-muted/50 border-b">
                                                <td className="px-4 py-2 font-medium">{st.name}</td>
                                                <td className="px-4 py-2">{st.points}</td>
                                                <td className="px-4 py-2">
                                                    <Badge variant="outline" className="capitalize">
                                                        {st.target}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-2">{st.group?.name ?? '-'}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex justify-end gap-2">
                                                        <ScoreTypeFormDialog
                                                            scoreType={st}
                                                            groups={groups}
                                                            trigger={
                                                                <Button size="sm" variant="outline">
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            }
                                                        />
                                                        <DeleteScoreTypeDialog scoreType={st} />
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
