import { useChangedAt } from '@/hooks/use-changed-at';
import PublicLayout from '@/layouts/public-layout';
import { allianceTeams, roundCode, roundLabel } from '@/lib/alliance-utils';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type AllianceGroup, type EliminationBracket, type EliminationSeries, type SharedData } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { Printer, Trophy } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

const STAGES = ['quarterfinal', 'semifinal', 'final'];

const BRACKET_ITEM = 'overflow-hidden text-center font-[Tahoma] text-ellipsis text-black';
const BRACKET_BOX = 'm-[0.5em] h-[1.75em] border border-black';

function stageOf(round: string): string {
    return round.replace(/^tiebreaker_/, '').replace(/_\d+$/, '');
}

function seriesNumber(round: string): number {
    return Number(round.match(/_(\d+)$/)?.[1] ?? 1);
}

function teamNumbersOf(group: AllianceGroup): string {
    return allianceTeams(group)
        .map((team) => team.number)
        .join(', ');
}

function BracketBar({ seed, alliance, wins, origin }: { seed: ReactNode; alliance?: ReactNode; wins?: ReactNode; origin?: string }) {
    return (
        <div data-bar data-origin={origin} className="flex w-full flex-row items-center justify-between border border-black">
            <div className={cn(BRACKET_ITEM, BRACKET_BOX, 'min-w-[3em] p-[0.2em]')}>{seed}</div>
            <div className={BRACKET_ITEM}>{alliance}</div>
            <div className={cn(BRACKET_ITEM, BRACKET_BOX, 'min-w-[1.75em]')}>{wins}</div>
        </div>
    );
}

function BracketLevel({
    round,
    column,
    row,
    rowSpan,
    children,
}: {
    round: string;
    column: number;
    row: number;
    rowSpan: number;
    children: ReactNode;
}) {
    return (
        <div
            data-level={round}
            className="flex flex-col items-center self-center"
            style={{ gridColumn: `${column} / span 1`, gridRow: `${row} / span ${rowSpan}` }}
        >
            <div className="text-center font-[Tahoma] text-[24px] font-bold">{roundLabel(round)}</div>
            {children}
        </div>
    );
}

function SeriesBars({ series, feeders }: { series: EliminationSeries; feeders: EliminationSeries[] }) {
    const groups = [
        { group: series.alliance_group1, wins: series.result?.group_1_wins },
        { group: series.alliance_group2, wins: series.result?.group_2_wins },
    ];

    return (
        <>
            {groups.map(({ group, wins }) => (
                <BracketBar
                    key={group.id}
                    seed={`A${group.seed}`}
                    alliance={teamNumbersOf(group)}
                    wins={wins || null}
                    origin={feeders.find((feeder) => feeder.winner_alliance_group_id === group.id)?.round}
                />
            ))}
        </>
    );
}

function useConnectorPaths(signature: string) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [paths, setPaths] = useState<string[]>([]);

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const measure = () => {
            const base = container.getBoundingClientRect();
            const next: string[] = [];

            container.querySelectorAll<HTMLElement>('[data-level]').forEach((level) => {
                const bars = level.querySelectorAll<HTMLElement>('[data-bar]');
                const target = container.querySelector<HTMLElement>(`[data-origin="${level.dataset.level}"]`);

                if (bars.length < 2 || !target) {
                    return;
                }

                const upper = bars[0].getBoundingClientRect();
                const lower = bars[1].getBoundingClientRect();
                const targetRect = target.getBoundingClientRect();
                const startX = upper.x + upper.width - base.x;
                const upperY = upper.y + upper.height / 2 - base.y;
                const lowerY = lower.y + lower.height / 2 - base.y;
                const targetX = targetRect.x - base.x;
                const targetY = targetRect.y + targetRect.height / 2 - base.y;

                next.push(`M ${startX} ${upperY} h 15 V ${lowerY} h -15`);
                next.push(`M ${startX + 15} ${(upperY + lowerY) / 2} H ${targetX - 15} V ${targetY} H ${targetX}`);
            });

            setPaths(next);
        };

        const observer = new ResizeObserver(measure);
        observer.observe(container);

        return () => observer.disconnect();
    }, [signature]);

    return { containerRef, paths };
}

function BracketBody({ bracket, printable }: { bracket: EliminationBracket | undefined; printable: boolean }) {
    const { event } = usePage<SharedData>().props;
    const updatedAt = useChangedAt(bracket);
    const series = bracket?.series ?? [];
    const allianceGroups = bracket?.alliance_groups ?? [];
    const firstStage = STAGES.findIndex((stage) => series.some((entry) => stageOf(entry.round) === stage));
    const stages = firstStage < 0 ? [] : STAGES.slice(firstStage);
    const rows = Math.max(1, 2 ** (stages.length - 1));
    const levels = stages.flatMap((stage, stageIndex) => {
        const rowSpan = 2 ** stageIndex;
        const feederStage = stages[stageIndex - 1];

        return Array.from({ length: rows / rowSpan }, (_, index) => {
            const round = stage === 'final' ? 'final' : `${stage}_${index + 1}`;
            const feederRounds = feederStage ? [`${feederStage}_${index * 2 + 1}`, `${feederStage}_${index * 2 + 2}`] : [];

            return {
                round,
                column: stageIndex + 1,
                row: index * rowSpan + 1,
                rowSpan,
                feederRounds,
                series: series.find((entry) => stageOf(entry.round) === stage && seriesNumber(entry.round) === index + 1),
                feeders: series.filter((entry) => feederRounds.includes(entry.round)),
            };
        });
    });
    const signature = series.map((entry) => `${entry.id}:${entry.winner_alliance_group_id}:${entry.round}`).join('|');
    const { containerRef, paths } = useConnectorPaths(signature);

    return (
        <div>
            <br />
            <div className="-mx-3 flex flex-wrap justify-center">
                <div className="w-3/12 px-3 print:hidden">&nbsp;</div>
                <h2 className={cn(bs.h2, 'w-6/12 px-3 text-center')}>{event?.name} Playoff Bracket</h2>
                <div className="w-2/12 px-3 print:hidden">&nbsp;</div>
                {printable ? (
                    <button type="button" className={cn(bs.btnLight, 'w-1/12 print:hidden')} onClick={() => window.print()} title="Print">
                        <Printer className="mx-auto size-8" />
                    </button>
                ) : (
                    <div className="w-1/12 print:hidden" />
                )}
            </div>
            <div>&nbsp;</div>

            <div
                className="mx-[1em] grid gap-[1em]"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(allianceGroups.length / 2))}, minmax(0, 1fr))` }}
            >
                {allianceGroups.map((group) => (
                    <div key={group.id} className="flex w-full flex-row items-center justify-between border border-black">
                        <div className={cn(BRACKET_ITEM, BRACKET_BOX, 'min-w-[3em] p-[0.2em]')}>{group.seed}</div>
                        <div className={BRACKET_ITEM}>{group.captain_team.number}</div>
                        <div className={cn(BRACKET_ITEM, 'mr-[0.5em]')}>{group.picked_team?.number}</div>
                        {group.second_picked_team && <div className={cn(BRACKET_ITEM, 'mr-[0.5em]')}>{group.second_picked_team.number}</div>}
                    </div>
                ))}
            </div>
            <div>&nbsp;</div>

            <div
                ref={containerRef}
                className="relative grid grid-cols-4 gap-x-[3em] text-[11pt]"
                style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}
            >
                {levels.map((level) => (
                    <BracketLevel key={level.round} round={level.round} column={level.column} row={level.row} rowSpan={level.rowSpan}>
                        {level.series ? (
                            <SeriesBars series={level.series} feeders={level.feeders} />
                        ) : (
                            level.feederRounds.map((feederRound) => (
                                <BracketBar
                                    key={feederRound}
                                    origin={feederRound}
                                    seed={
                                        <>
                                            {roundCode(feederRound)}
                                            <Trophy className="inline size-[1em] align-[-0.125em]" />
                                        </>
                                    }
                                />
                            ))
                        )}
                    </BracketLevel>
                ))}
                <svg className="pointer-events-none absolute top-0 left-0 overflow-visible">
                    {paths.map((path) => (
                        <path key={path} d={path} stroke="black" fill="transparent" strokeWidth={4} />
                    ))}
                </svg>
            </div>

            <small className="mt-4 block text-center text-[0.875em]">
                Data current as of {updatedAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'medium' })}
            </small>
        </div>
    );
}

export default function EliminationBracketDisplay() {
    const { component } = usePage();
    const { value: bracket } = useProp<EliminationBracket>('bracket');

    if (component !== 'elimination/bracket') {
        return (
            <div className="min-h-screen w-full bg-white px-6 py-3 text-[#212529]">
                <BracketBody bracket={bracket} printable={false} />
            </div>
        );
    }

    return (
        <PublicLayout>
            <Head title="Playoff Bracket" />
            <BracketBody bracket={bracket} printable />
        </PublicLayout>
    );
}
