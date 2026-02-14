import { useActiveMatch, useLoadedMatch, useMatch } from '@/hooks/use-match';
import { useMatchTimer } from '@/hooks/use-match-timer';
import { formatTime, getAllianceScore, getPhaseColors } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { Head } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

// Match timing constants
const MATCH_DURATION = 160;
const TRANSITION_DURATION = 10;
const MAX_DISPLAY_TIME = MATCH_DURATION - TRANSITION_DURATION; // 160 - 10 = 150 seconds (2:30)

export default function MatchOverlay() {
    const { data: activeMatch } = useActiveMatch(500);
    const { data: loadedMatch } = useLoadedMatch(500);
    const { data: match } = useMatch(activeMatch?.id ?? null, 500);
    const timer = useMatchTimer(); // No config = no audio
    const lastStartedMatchIdRef = useRef<number | null>(null);
    const lastEndedMatchIdRef = useRef<number | null>(null);

    // Track the running match ID BEFORE it ends (save it early!)
    useEffect(() => {
        if (timer.isRunning && match?.id) {
            // Save the match ID while it's still running
            console.log('[Save Match ID]', match.id);
            lastEndedMatchIdRef.current = match.id;
        }
    }, [timer.isRunning, match?.id]);

    // Log the ref value
    useEffect(() => {
        console.log('[Ref Value]', 'lastEndedMatchId =', lastEndedMatchIdRef.current);
    }, [timer.phase, lastEndedMatchIdRef.current]);

    // Fetch the last ended match data to show final scores
    const { data: endedMatch } = useMatch(lastEndedMatchIdRef.current, 500);

    // Use the appropriate match data based on state
    const displayMatch = match || (timer.phase === 'post-match' && endedMatch) || loadedMatch;

    // Debug logging
    useEffect(() => {
        console.log('[Overlay Debug]', {
            'timer.phase': timer.phase,
            'activeMatch': activeMatch,
            'loadedMatch': loadedMatch,
            'match': match,
            'endedMatch': endedMatch,
            'lastEndedMatchId': lastEndedMatchIdRef.current,
            'displayMatch': displayMatch,
            'displayMatch.match_alliances': displayMatch?.match_alliances,
        });
    }, [timer.phase, activeMatch, loadedMatch, match, endedMatch, displayMatch]);

    // Auto-resume timer when an active match exists, reset when match changes
    useEffect(() => {
        if (activeMatch && activeMatch.status === 'ongoing' && activeMatch.started_at) {
            if (!timer.isRunning && lastStartedMatchIdRef.current !== activeMatch.id) {
                timer.resumeFrom(activeMatch.started_at);
                lastStartedMatchIdRef.current = activeMatch.id;
            }
        } else if (timer.isRunning) {
            timer.stop();
        } else if (!activeMatch && timer.phase === 'post-match') {
            // Reset timer when no active match (new match loaded but not started)
            timer.cancel();
        }

        // Clear ended match when a new match is loaded
        if (loadedMatch && loadedMatch.id !== lastEndedMatchIdRef.current) {
            lastEndedMatchIdRef.current = null;
        }
    }, [activeMatch, timer, loadedMatch]);

    const phaseColors = getPhaseColors(timer.phase);
    const redScore = displayMatch ? getAllianceScore(displayMatch, 'red') : 0;
    const blueScore = displayMatch ? getAllianceScore(displayMatch, 'blue') : 0;
    const redTeams = displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'red') ?? [];
    const blueTeams = displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'blue') ?? [];

    // Check if match is loaded but not started
    const isMatchLoaded = loadedMatch && !activeMatch && timer.phase === 'pre-match';

    // Debug teams and scores
    useEffect(() => {
        console.log('[Teams & Scores]', {
            redScore,
            blueScore,
            'redTeams.length': redTeams.length,
            'blueTeams.length': blueTeams.length,
            redTeams,
            blueTeams,
        });
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
                            ) : (
                                <div className="text-8xl font-black text-white tabular-nums leading-none">
                                    {formatTime(Math.min(MAX_DISPLAY_TIME, timer.phase === 'autonomous' ? timer.remainingSeconds - 10 : timer.remainingSeconds))}
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
