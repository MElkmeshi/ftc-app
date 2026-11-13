import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type Team } from '@/types';
import { router } from '@inertiajs/react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface AwardWinnerRow {
    id: number;
    place: number;
    recipient: string | null;
    team: Pick<Team, 'id' | 'number' | 'name'> | null;
}

export interface AwardRow {
    id: number;
    name: string;
    description: string | null;
    places: number;
    winners: AwardWinnerRow[];
}

export interface AwardPresentation {
    award_id: number;
    revealed: number;
}

export function winnersText(award: AwardRow, place: number): string {
    return award.winners
        .filter((winner) => winner.place === place)
        .map((winner) => [winner.team ? `${winner.team.number} ${winner.team.name}` : null, winner.recipient].filter(Boolean).join(' - '))
        .join(', ');
}

const PLACE_LABELS = ['Winner', '2nd Place', '3rd Place'];
const listItem =
    'block w-full cursor-pointer border border-t-0 border-black/[0.125] px-4 py-2 text-left first:rounded-t-md first:border-t last:rounded-b-md';

interface PresentationStep {
    award: AwardRow;
    revealed: number;
}

function presentationSteps(awards: AwardRow[]): PresentationStep[] {
    return awards.flatMap((award) => Array.from({ length: award.places + 1 }, (_, revealed) => ({ award, revealed })));
}

function StepLine({ step, active, stealth, onPresent }: { step: PresentationStep; active: boolean; stealth: boolean; onPresent: () => void }) {
    const [peeking, setPeeking] = useState(false);
    const line = useRef<HTMLDivElement>(null);
    const place = step.award.places - step.revealed + 1;

    useEffect(() => {
        if (active) {
            line.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [active]);

    if (step.revealed === 0) {
        return (
            <div
                ref={line}
                role="button"
                tabIndex={0}
                aria-current={active}
                className={cn(listItem, active ? 'border-[#0d6efd] bg-[#0d6efd] text-white' : 'bg-white hover:bg-[#f8f9fa]')}
                onClick={onPresent}
                onKeyDown={(keyEvent) => keyEvent.key === 'Enter' && onPresent()}
            >
                <b>{step.award.name}</b> About Award
            </div>
        );
    }

    return (
        <div
            ref={line}
            role="button"
            tabIndex={0}
            aria-current={active}
            className={cn(listItem, active ? 'border-[#0d6efd] bg-[#0d6efd] text-white' : 'bg-[#e2e3e5] text-[#2b2f32] hover:bg-[#cbccce]')}
            onClick={onPresent}
            onKeyDown={(keyEvent) => keyEvent.key === 'Enter' && onPresent()}
        >
            <b className="ml-6">{PLACE_LABELS[place - 1] ?? `Place ${place}`}</b>&nbsp;
            {!stealth || peeking ? winnersText(step.award, place) || 'NOT GIVEN' : '<Hidden>'}
            {stealth && (
                <button
                    type="button"
                    aria-pressed={peeking}
                    className={cn(
                        'float-right mr-1 rounded border px-1.5 text-sm',
                        peeking ? 'border-[#babbbc] bg-[#c6c7c8] text-black' : 'border-[#f8f9fa] bg-[#f8f9fa] text-black',
                    )}
                    onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        setPeeking(!peeking);
                    }}
                >
                    Peek
                </button>
            )}
        </div>
    );
}

export function PresentAwards({
    awards,
    base,
    locked,
    presenting,
}: {
    awards: AwardRow[];
    base: string;
    locked: boolean;
    presenting: AwardPresentation | null;
}) {
    const [stealth, setStealth] = useState(true);
    const steps = presentationSteps(awards);
    const current = presenting ? steps.findIndex((step) => step.award.id === presenting.award_id && step.revealed === presenting.revealed) : -1;
    const show = (step: PresentationStep | undefined) =>
        step && router.post(`${base}/awards/${step.award.id}/present`, { revealed: step.revealed }, { preserveScroll: true });

    return (
        <div>
            <h2 className={`${bs.h2} text-center`}>Awards Presentation</h2>
            {locked ? (
                <>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            className={`${bs.btnSecondary} ${bs.btnSm}`}
                            disabled={current <= 0}
                            onClick={() => show(steps[current - 1])}
                        >
                            <ArrowUp className="mr-1 inline size-3.5" />
                            Previous
                        </button>
                        <label className="flex items-center gap-1">
                            <input type="checkbox" checked={stealth} onChange={(changeEvent) => setStealth(changeEvent.target.checked)} />
                            Stealth Mode
                        </label>
                        <button
                            type="button"
                            className={`${bs.btnWarning} ${bs.btnSm} ml-auto`}
                            onClick={() => router.delete(`${base}/awards/presenting`, { preserveScroll: true })}
                        >
                            Show Blank
                        </button>
                        <button
                            type="button"
                            className={`${bs.btnSecondary} ${bs.btnSm}`}
                            disabled={current >= steps.length - 1}
                            onClick={() => show(steps[current + 1])}
                        >
                            <ArrowDown className="mr-1 inline size-3.5" />
                            Next
                        </button>
                    </div>
                    <div>
                        {steps.map((step, index) => (
                            <StepLine
                                key={`${step.award.id}-${step.revealed}`}
                                step={step}
                                active={index === current}
                                stealth={stealth}
                                onPresent={() => show(step)}
                            />
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className={bs.alertWarning}>Awards must be finalized before they can be presented.</div>
                    <button
                        type="button"
                        className={bs.btnDanger}
                        disabled={awards.length === 0}
                        onClick={() => router.put(`${base}/awards/lock`, { locked: true }, { preserveScroll: true })}
                    >
                        Finalize Awards for Presentation
                    </button>
                </>
            )}
        </div>
    );
}
