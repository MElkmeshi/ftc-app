import { currentGameId, resolveEventHref } from '@/lib/event';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type GameSummary } from '@/types';
import { Link } from '@inertiajs/react';
import { AlertTriangle, Gamepad2 } from 'lucide-react';

type GamePage = 'scoring' | 'settings';

const PAGE_TITLES: Record<GamePage, string> = { scoring: 'Score Types', settings: 'Match Timing' };

const EVENT_PAGE_PATHS: Record<GamePage, string> = { scoring: '/admin/score-types', settings: '/admin/competition-settings' };

/**
 * Breadcrumbs for a game editing page, which is reached either from the
 * Games page (`/games/{id}/...`) or from inside an event that plays the game.
 */
export function gameBreadcrumbs(game: GameSummary, page: GamePage): BreadcrumbItem[] {
    if (currentGameId() === null) {
        return [
            { title: 'Setup', href: EVENT_PAGE_PATHS[page] },
            { title: PAGE_TITLES[page], href: EVENT_PAGE_PATHS[page] },
        ];
    }

    return [
        { title: 'Games', href: '/games' },
        { title: game.name, href: `/games/${game.id}/scoring` },
        { title: PAGE_TITLES[page], href: `/games/${game.id}/${page}` },
    ];
}

/**
 * Says which game this page edits and which events play it. Editing a game
 * changes it for all of them, so events that already played matches get a
 * warning (their recorded scores keep the points they were worth).
 */
export function GameBanner({ game, page }: { game: GameSummary; page: GamePage }) {
    const onGamePage = currentGameId() !== null;
    const playedEvents = game.events.filter((event) => event.has_played_matches);
    const tabHref = (target: GamePage) => (onGamePage ? `/games/${game.id}/${target}` : resolveEventHref(EVENT_PAGE_PATHS[target]));

    return (
        <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm">
                    <Gamepad2 className="text-muted-foreground size-4" />
                    <span>
                        Game <span className="font-semibold">{game.name}</span>
                        <span className="text-muted-foreground">
                            {' · '}
                            {game.events.length === 0 ? 'no event plays it yet' : `played by ${game.events.map((event) => event.name).join(', ')}`}
                        </span>
                    </span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                    {(Object.keys(PAGE_TITLES) as GamePage[]).map((target) => (
                        <Link
                            key={target}
                            href={tabHref(target)}
                            className={cn(
                                'rounded-md px-3 py-1',
                                target === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                            )}
                        >
                            {PAGE_TITLES[target]}
                        </Link>
                    ))}
                    <Link href="/games" className="text-muted-foreground hover:bg-muted rounded-md px-3 py-1">
                        All games
                    </Link>
                </div>
            </div>

            {(playedEvents.length > 0 || game.events.length > 1) && (
                <div
                    role="status"
                    className="flex items-start gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200"
                >
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <p>
                        Changes here apply to every event playing this game ({game.events.map((event) => event.name).join(', ')}).
                        {playedEvents.length > 0 &&
                            ` ${playedEvents.map((event) => event.name).join(', ')} already played matches: scores already recorded keep the points they were worth, but rankings, timing and new scores use the new rules.`}
                    </p>
                </div>
            )}
        </div>
    );
}
