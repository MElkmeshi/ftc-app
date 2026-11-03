import { cn } from '@/lib/utils';
import { type GameLook, type ScoreType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** The current game's logo and background, if it has them. */
export function useGameLook(): GameLook | null {
    return usePage<SharedData>().props.currentGame ?? null;
}

/**
 * The game's background, dimmed behind a display screen. The screen needs
 * `isolate` so the picture sits above its colour but below its content.
 */
export function GameBackground() {
    const game = useGameLook();

    if (!game?.background_url) {
        return null;
    }

    return (
        <img src={game.background_url} alt="" aria-hidden className="pointer-events-none absolute inset-0 -z-10 size-full object-cover opacity-30" />
    );
}

export function GameLogo({ className }: { className?: string }) {
    const game = useGameLook();

    if (!game?.logo_url) {
        return null;
    }

    return <img src={game.logo_url} alt={game.name} className={cn('object-contain', className)} />;
}

/**
 * The picture of a score type's game piece or action. Uploaded pictures are
 * only ever shown through <img>, so an SVG can never run code here.
 */
export function ScoreTypeIcon({ scoreType, className }: { scoreType: Pick<ScoreType, 'name' | 'icon_url'>; className?: string }) {
    if (!scoreType.icon_url) {
        return null;
    }

    return <img src={scoreType.icon_url} alt="" aria-hidden className={cn('size-8 shrink-0 object-contain', className)} />;
}
