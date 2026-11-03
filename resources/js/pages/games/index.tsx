import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem, type GameEventSummary, type SharedData } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Copy, Gamepad2, ListChecks, Pencil, Plus, Timer, Trash2 } from 'lucide-react';
import { type FormEventHandler, useState } from 'react';

interface GameRow {
    id: number;
    name: string;
    description: string | null;
    ranking_method: string;
    score_types_count: number;
    groups_count: number;
    events: GameEventSummary[];
}

interface GamesProps extends SharedData {
    games: GameRow[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Games', href: '/games' }];

const selectClassName =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm';

/** Creates a blank game, or a copy of an existing one to tweak for a new season or variant. */
function NewGameDialog({ games, duplicateFrom, onClose }: { games: GameRow[]; duplicateFrom: GameRow | null; onClose: () => void }) {
    const { data, setData, post, errors, processing } = useForm({
        name: duplicateFrom ? `${duplicateFrom.name} (copy)` : '',
        description: duplicateFrom?.description ?? '',
        duplicate_from: duplicateFrom ? String(duplicateFrom.id) : '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/games', { onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>New game</DialogTitle>
                        <DialogDescription>A game holds the score types, match timing and ranking that events play with.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="game-name">Name</Label>
                        <Input id="game-name" value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="game-description">Description</Label>
                        <Input id="game-description" value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        <InputError message={errors.description} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="game-duplicate-from">Start from</Label>
                        <select
                            id="game-duplicate-from"
                            className={selectClassName}
                            value={data.duplicate_from}
                            onChange={(e) => setData('duplicate_from', e.target.value)}
                        >
                            <option value="">A blank game</option>
                            {games.map((game) => (
                                <option key={game.id} value={game.id}>
                                    A copy of {game.name}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.duplicate_from} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Create game
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function RenameGameDialog({ game, onClose }: { game: GameRow; onClose: () => void }) {
    const { data, setData, put, errors, processing } = useForm({ name: game.name, description: game.description ?? '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        put(`/games/${game.id}`, { preserveScroll: true, onSuccess: onClose });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>Rename game</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="rename-name">Name</Label>
                        <Input id="rename-name" value={data.name} onChange={(e) => setData('name', e.target.value)} autoFocus />
                        <InputError message={errors.name} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="rename-description">Description</Label>
                        <Input id="rename-description" value={data.description} onChange={(e) => setData('description', e.target.value)} />
                        <InputError message={errors.description} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={processing}>
                            Save
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function DeleteGameDialog({ game, onClose }: { game: GameRow; onClose: () => void }) {
    const [processing, setProcessing] = useState(false);

    const remove = () => {
        router.delete(`/games/${game.id}`, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: onClose,
        });
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete {game.name}?</DialogTitle>
                    <DialogDescription>Its score types, groups and timing are deleted too. No event plays this game.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={remove} disabled={processing}>
                        Delete game
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function GameCard({ game, onRename, onDuplicate, onDelete }: { game: GameRow; onRename: () => void; onDuplicate: () => void; onDelete: () => void }) {
    return (
        <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                        <Gamepad2 className="text-muted-foreground size-5" />
                        {game.name}
                    </CardTitle>
                    {game.description && <CardDescription>{game.description}</CardDescription>}
                    <p className="text-muted-foreground text-sm">
                        {game.score_types_count} score type{game.score_types_count === 1 ? '' : 's'} · {game.groups_count} group
                        {game.groups_count === 1 ? '' : 's'} · {game.ranking_method}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm">
                        <Link href={`/games/${game.id}/scoring`}>
                            <ListChecks className="mr-1 size-4" /> Score types
                        </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                        <Link href={`/games/${game.id}/settings`}>
                            <Timer className="mr-1 size-4" /> Timing &amp; ranking
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" onClick={onRename} aria-label={`Rename ${game.name}`}>
                        <Pencil className="size-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={onDuplicate} aria-label={`Duplicate ${game.name}`}>
                        <Copy className="size-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onDelete}
                        disabled={game.events.length > 0}
                        title={game.events.length > 0 ? 'Events play this game, so it cannot be deleted' : undefined}
                        aria-label={`Delete ${game.name}`}
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Played by:</span>
                {game.events.length === 0 ? (
                    <span className="text-muted-foreground">no events yet</span>
                ) : (
                    game.events.map((event) => (
                        <Link key={event.code} href={`/event/${event.code}/dashboard`}>
                            <Badge variant={event.has_played_matches ? 'default' : 'outline'}>
                                {event.name}
                                {event.has_played_matches && ' · matches played'}
                            </Badge>
                        </Link>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

type OpenDialog = { kind: 'new'; duplicateFrom: GameRow | null } | { kind: 'rename' | 'delete'; game: GameRow } | null;

/**
 * Every game on this server. Events pick one of these in Event details, and
 * a game can be shared by many events (for example every meet of a league).
 */
export default function GamesIndex() {
    const { games, errors } = usePage<GamesProps & { errors: Record<string, string> }>().props;
    const [dialog, setDialog] = useState<OpenDialog>(null);
    const close = () => setDialog(null);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Games" />

            <div className="mx-auto w-full max-w-5xl space-y-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Games</h1>
                        <p className="text-muted-foreground">
                            A game is what robots score points for, how long matches last and how teams are ranked. Events pick a game, and editing a
                            game changes it for every event that plays it.
                        </p>
                    </div>
                    <Button onClick={() => setDialog({ kind: 'new', duplicateFrom: null })}>
                        <Plus className="mr-1 size-4" /> New game
                    </Button>
                </div>

                <InputError message={errors.game} />

                {games.length === 0 ? (
                    <Card>
                        <CardContent className="text-muted-foreground py-10 text-center">No games yet. Create one to get started.</CardContent>
                    </Card>
                ) : (
                    games.map((game) => (
                        <GameCard
                            key={game.id}
                            game={game}
                            onRename={() => setDialog({ kind: 'rename', game })}
                            onDuplicate={() => setDialog({ kind: 'new', duplicateFrom: game })}
                            onDelete={() => setDialog({ kind: 'delete', game })}
                        />
                    ))
                )}
            </div>

            {dialog?.kind === 'new' && <NewGameDialog games={games} duplicateFrom={dialog.duplicateFrom} onClose={close} />}
            {dialog?.kind === 'rename' && <RenameGameDialog game={dialog.game} onClose={close} />}
            {dialog?.kind === 'delete' && <DeleteGameDialog game={dialog.game} onClose={close} />}
        </AppLayout>
    );
}
