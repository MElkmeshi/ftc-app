import { EventBar, Stage } from '@/components/display/display-kit';
import { placeLabel } from '@/lib/award-utils';
import { cn } from '@/lib/utils';
import { type AwardRecipient, type PresentedAward } from '@/types';
import { Head } from '@inertiajs/react';
import { Award as AwardIcon } from 'lucide-react';

function Recipients({ winners, large }: { winners: AwardRecipient[]; large: boolean }) {
    return (
        <div className={cn('flex flex-wrap justify-center', large ? 'gap-x-16 gap-y-6' : 'gap-x-10 gap-y-2')}>
            {winners.map((winner, index) => (
                <div key={index} className="text-center">
                    {winner.team_number && (
                        <div
                            className={cn('font-mono leading-none font-black tabular-nums', large ? 'text-[min(8rem,15vh)]' : 'text-[min(3rem,6vh)]')}
                        >
                            {winner.team_number}
                        </div>
                    )}
                    {winner.team_name && (
                        <div className={cn('font-semibold', large ? 'text-[min(2.25rem,5vh)]' : 'text-[min(1.5rem,3.5vh)] text-white/80')}>
                            {winner.team_name}
                        </div>
                    )}
                    {winner.recipient && (
                        <div className={cn(large ? 'mt-2 text-3xl text-yellow-300' : 'text-xl text-yellow-300/80')}>{winner.recipient}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * An award on the audience display. The latest place announced is shown
 * large, with the places announced before it underneath.
 */
export function AwardScreen({ award }: { award: PresentedAward }) {
    const latest = award.revealed.at(-1);
    const earlier = award.revealed.slice(0, -1).reverse();

    return (
        <Stage className="flex flex-col items-center justify-center gap-[min(2.5rem,4vh)] px-16 pt-[3vh] pb-[20vh]">
            <Head title={award.name} />
            <div className="flex flex-col items-center gap-[min(1rem,2vh)] text-center">
                {latest === undefined && <AwardIcon className="size-[min(5rem,9vh)] text-yellow-400" />}
                <h1 className="text-[min(4.5rem,10vh)] leading-tight font-black tracking-tight">{award.name}</h1>
                {award.description && latest === undefined && <p className="max-w-5xl text-3xl leading-snug text-white/70">{award.description}</p>}
            </div>
            {latest && (
                <div className="flex flex-col items-center gap-4">
                    <div className="text-[min(1.875rem,4vh)] font-semibold tracking-widest text-yellow-400 uppercase">
                        {placeLabel(latest.place, award.places)}
                    </div>
                    {latest.winners.length > 0 ? (
                        <Recipients winners={latest.winners} large />
                    ) : (
                        <div className="text-4xl text-white/60">Not awarded</div>
                    )}
                </div>
            )}
            {earlier.length > 0 && (
                <div className="flex flex-wrap justify-center gap-16 border-t border-white/10 pt-[3vh]">
                    {earlier.map((place) => (
                        <div key={place.place} className="flex flex-col items-center gap-2">
                            <div className="text-lg tracking-widest text-white/50 uppercase">{placeLabel(place.place, award.places)}</div>
                            <Recipients winners={place.winners} large={false} />
                        </div>
                    ))}
                </div>
            )}
            <EventBar />
        </Stage>
    );
}
