import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useFieldCount } from '@/hooks/use-field-count';
import { useMatch } from '@/hooks/use-match';
import { useRefereeField } from '@/hooks/use-referee-field';
import { formatTime, getAllianceScore, getFieldLabel, getPhaseColors, getPhaseLabel } from '@/lib/match-utils';
import { cn } from '@/lib/utils';

interface MatchTimerBannerProps {
    showScores?: boolean;
    /** On a referee scoring page: offer the field picker and follow only that tablet's field. */
    forRefereeTablet?: boolean;
}

/**
 * Lets a referee tablet say which field it scores at a multi-field event,
 * so it only picks up matches on that field (like FTC Live).
 */
function RefereeFieldPicker() {
    const fieldCount = useFieldCount();
    const [field, setField] = useRefereeField();

    if (fieldCount < 2) {
        return null;
    }

    const choices: (number | null)[] = [...Array.from({ length: fieldCount }, (_, index) => index + 1), null];

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">This tablet scores</span>
            <div className="flex rounded-md border p-0.5" role="radiogroup" aria-label="Field this tablet scores">
                {choices.map((choice) => (
                    <button
                        key={choice ?? 'all'}
                        type="button"
                        role="radio"
                        aria-checked={field === choice}
                        onClick={() => setField(choice)}
                        className={cn(
                            'rounded px-3 py-1 text-sm font-medium',
                            field === choice ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {choice ? `Field ${choice}` : 'Any field'}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function MatchTimerBanner({ showScores = true, forRefereeTablet = true }: MatchTimerBannerProps) {
    const [tabletField] = useRefereeField();
    const refereeField = forRefereeTablet ? tabletField : null;
    const fieldCount = useFieldCount();
    const { timer, activeMatch } = useActiveMatchTimer({ field: refereeField });
    const { data: match } = useMatch(activeMatch?.id ?? null, 500);

    const redScore = match ? getAllianceScore(match, 'red') : 0;
    const blueScore = match ? getAllianceScore(match, 'blue') : 0;
    const isRunning = !!activeMatch && activeMatch.status === 'ongoing';
    const fieldLabel = activeMatch ? getFieldLabel(activeMatch, fieldCount) : null;

    return (
        <>
            {forRefereeTablet && <RefereeFieldPicker />}
            {isRunning && (
                <TimerBar
                    timer={timer}
                    matchNumber={activeMatch.number}
                    fieldLabel={fieldLabel}
                    showScores={showScores}
                    redScore={redScore}
                    blueScore={blueScore}
                />
            )}
            {!isRunning && refereeField && <p className="text-muted-foreground text-sm">Waiting for the next match on Field {refereeField}.</p>}
        </>
    );
}

function TimerBar({
    timer,
    matchNumber,
    fieldLabel,
    showScores,
    redScore,
    blueScore,
}: {
    timer: ReturnType<typeof useActiveMatchTimer>['timer'];
    matchNumber: number;
    fieldLabel: string | null;
    showScores: boolean;
    redScore: number;
    blueScore: number;
}) {
    const phaseColors = getPhaseColors(timer.phase);

    return (
        <div className={cn('rounded-lg border border-white/20 px-6 py-4', phaseColors.bg + '/10')}>
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <span
                        className={cn('text-sm font-bold tracking-widest uppercase', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}
                    >
                        {getPhaseLabel(timer.phase)}
                    </span>
                    {showScores && <span className="text-muted-foreground text-sm">Match #{matchNumber}</span>}
                    {fieldLabel && <span className="rounded bg-sky-500/15 px-2 py-0.5 text-sm font-bold text-sky-400">{fieldLabel}</span>}
                </div>

                <div className="flex items-center gap-6">
                    {showScores && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-red-500">RED</span>
                            <span className="font-mono text-2xl font-black text-red-500 tabular-nums">{redScore}</span>
                        </div>
                    )}
                    <span className={cn('font-mono text-3xl font-black tabular-nums', phaseColors.text)}>
                        {timer.phase === 'transition' ? timer.phaseRemainingSeconds : formatTime(timer.phaseRemainingSeconds)}
                    </span>
                    {showScores && (
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-2xl font-black text-blue-500 tabular-nums">{blueScore}</span>
                            <span className="text-sm font-semibold text-blue-500">BLUE</span>
                        </div>
                    )}
                </div>

                <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
                    <div
                        className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)}
                        style={{ width: `${timer.progressPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
