import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useLoadedMatch, useMatch } from '@/hooks/use-match';
import { formatTime, getAllianceScore, getPhaseColors } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

export default function MatchOverlay() {
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ resetOnIdle: true });
    const { data: loadedMatch } = useLoadedMatch(500);
    const { data: match } = useMatch(activeMatch?.id ?? null, 500);
    const lastEndedMatchIdRef = useRef<number | null>(null);

    // Track the running match ID before it ends so we can show final scores
    useEffect(() => {
        if (timer.isRunning && match?.id) {
            lastEndedMatchIdRef.current = match.id;
        }
    }, [timer.isRunning, match?.id]);

    // Clear ended match ref when a new match is loaded
    useEffect(() => {
        if (loadedMatch && loadedMatch.id !== lastEndedMatchIdRef.current) {
            lastEndedMatchIdRef.current = null;
        }
    }, [loadedMatch]);

    // Fetch the last ended match data to show final scores
    const { data: endedMatch } = useMatch(lastEndedMatchIdRef.current, 500);

    // Use the appropriate match data based on state
    const displayMatch = match || (timer.phase === 'post-match' && endedMatch) || loadedMatch;

    const phaseColors = getPhaseColors(timer.phase);
    const redScore = displayMatch ? getAllianceScore(displayMatch, 'red') : 0;
    const blueScore = displayMatch ? getAllianceScore(displayMatch, 'blue') : 0;
    const redTeams = displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'red') ?? [];
    const blueTeams = displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'blue') ?? [];

    // Check if match is loaded but not started
    const isMatchLoaded = loadedMatch && !activeMatch && timer.phase === 'pre-match';

    // Debug teams and scores
    useEffect(() => {
            }, [redScore, blueScore, redTeams, blueTeams]);

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden">
            <Head title="Match Overlay" />

            {/* Top 75% - Chroma Key Green Screen */}
            <div className="h-[75vh] w-full bg-[#00ff00]" />

            {/* Bottom 25% - Scorebug */}
            <div className="h-[25vh] w-full bg-slate-900/95 flex items-center justify-between px-12 gap-8">
                {/* Left: Red Alliance */}
                <div className="flex items-center gap-6 flex-1">
                    {/* Red Score Box */}
                    <div className="flex flex-col items-center justify-center bg-red-600/90 rounded-2xl px-10 py-6 min-w-[120px]">
                        <span className="text-sm font-bold text-red-200 uppercase tracking-wider mb-1">Red</span>
                        <span className="text-7xl font-black text-white tabular-nums leading-none">{redScore}</span>
                    </div>
                    {/* Red Teams */}
                    <div className="flex flex-col gap-3">
                        {redTeams.map((ma) => (
                            <div key={ma.id} className="bg-red-900/40 rounded-lg px-5 py-3 border-2 border-red-500/50">
                                <span className="text-xl font-black text-red-100">{ma.team.number}</span>
                                <span className="text-base text-red-300 ml-3 font-medium">{ma.team.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Timer and Match Info */}
                <div className="flex flex-col items-center gap-2 min-w-[320px]">
                    {displayMatch && <span className="text-sm font-bold text-white/60 uppercase tracking-widest mb-1">Match #{displayMatch.number}</span>}
                    {timer.phase === 'post-match' ? (
                        /* Match Ended - Show Final Results */
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-6xl font-black text-red-400 uppercase tracking-wider animate-pulse leading-none">Final</div>
                            <div className="text-3xl font-bold text-white/70 uppercase tracking-widest">Match Over</div>
                        </div>
                    ) : isMatchLoaded ? (
                        /* Match Loaded - Ready to Start */
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-6xl font-black text-green-400 uppercase tracking-wider animate-pulse leading-none">Ready</div>
                            <div className="text-2xl font-bold text-white/70 uppercase tracking-widest">Match Loaded</div>
                        </div>
                    ) : timer.phase !== 'pre-match' ? (
                        <>
                            {timer.phase === 'transition' ? (
                                <div className="text-8xl font-black text-orange-400 tabular-nums animate-pulse leading-none">{timer.phaseRemainingSeconds}</div>
                            ) : timer.phase === 'autonomous' ? (
                                <div className="text-8xl font-black text-white tabular-nums leading-none">
                                    {formatTime(timer.phaseRemainingSeconds + (matchConfig?.timing.teleop ?? 120))}
                                </div>
                            ) : (
                                <div className="text-8xl font-black text-white tabular-nums leading-none">
                                    {formatTime(timer.phaseRemainingSeconds)}
                                </div>
                            )}
                            {/* Progress bar */}
                            <div className="h-3 w-80 overflow-hidden rounded-full bg-white/20 mt-2">
                                <div className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)} style={{ width: `${timer.progressPercent}%` }} />
                            </div>
                        </>
                    ) : (
                        !displayMatch && !timer.isRunning && <span className="text-lg text-white/50">Waiting for match...</span>
                    )}
                </div>

                {/* Right: Blue Alliance */}
                <div className="flex items-center gap-6 flex-1 justify-end">
                    {/* Blue Teams */}
                    <div className="flex flex-col gap-3">
                        {blueTeams.map((ma) => (
                            <div key={ma.id} className="bg-blue-900/40 rounded-lg px-5 py-3 border-2 border-blue-500/50">
                                <span className="text-xl font-black text-blue-100">{ma.team.number}</span>
                                <span className="text-base text-blue-300 ml-3 font-medium">{ma.team.name}</span>
                            </div>
                        ))}
                    </div>
                    {/* Blue Score Box */}
                    <div className="flex flex-col items-center justify-center bg-blue-600/90 rounded-2xl px-10 py-6 min-w-[120px]">
                        <span className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-1">Blue</span>
                        <span className="text-7xl font-black text-white tabular-nums leading-none">{blueScore}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
