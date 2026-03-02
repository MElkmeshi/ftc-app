import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useMatch } from '@/hooks/use-match';
import { formatTime, getAllianceScore, getPhaseColors, getPhaseLabel } from '@/lib/match-utils';
import { cn } from '@/lib/utils';

interface MatchTimerBannerProps {
    showScores?: boolean;
}

export function MatchTimerBanner({ showScores = true }: MatchTimerBannerProps) {
    const { timer, activeMatch } = useActiveMatchTimer();
    const { data: match } = useMatch(activeMatch?.id ?? null, 500);

    const redScore = match ? getAllianceScore(match, 'red') : 0;
    const blueScore = match ? getAllianceScore(match, 'blue') : 0;

    if (!activeMatch || activeMatch.status !== 'ongoing') {
        return null;
    }

    const phaseColors = getPhaseColors(timer.phase);

    return (
        <div className={cn('rounded-lg border border-white/20 px-6 py-4', phaseColors.bg + '/10')}>
            <div className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <span className={cn('text-sm font-bold tracking-widest uppercase', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}>
                        {getPhaseLabel(timer.phase)}
                    </span>
                    {showScores && <span className="text-muted-foreground text-sm">Match #{activeMatch.number}</span>}
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
                    <div className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)} style={{ width: `${timer.progressPercent}%` }} />
                </div>
            </div>
        </div>
    );
}
