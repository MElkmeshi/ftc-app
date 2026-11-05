import { cn } from '@/lib/utils';
import { type TeamCard } from '@/types';

const CARD_CLASSES: Record<TeamCard, string> = {
    yellow: 'bg-yellow-400 text-yellow-950',
    red: 'bg-red-600 text-white',
};

export function TeamCardBadge({ card, className }: { card?: TeamCard | null; className?: string }) {
    if (!card) {
        return null;
    }

    return (
        <span
            title={`${card === 'red' ? 'Red' : 'Yellow'} card`}
            className={cn('inline-block rounded-sm px-1.5 text-[0.7em] leading-tight font-bold uppercase', CARD_CLASSES[card], className)}
        >
            {card}
        </span>
    );
}
