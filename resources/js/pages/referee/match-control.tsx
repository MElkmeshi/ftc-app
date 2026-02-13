import { useApi } from '@/hooks/use-api';
import { useAudioEngine } from '@/hooks/use-audio-engine';
import { useActiveMatch, useLoadedMatch, useMatch } from '@/hooks/use-match';
import { useMatchTimer } from '@/hooks/use-match-timer';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type MatchPhase } from '@/types';
import { Head } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function getPhaseLabel(phase: MatchPhase): string {
    switch (phase) {
        case 'autonomous':
            return 'AUTONOMOUS';
        case 'transition':
            return 'TRANSITION';
        case 'teleop':
            return 'TELEOP';
        case 'endgame':
            return 'ENDGAME';
        case 'post-match':
            return 'MATCH OVER';
        default:
            return 'PRE-MATCH';
    }
}

function getPhaseColors(phase: MatchPhase): { text: string; bg: string } {
    switch (phase) {
        case 'autonomous':
            return { text: 'text-yellow-400', bg: 'bg-yellow-400' };
        case 'transition':
            return { text: 'text-orange-400', bg: 'bg-orange-400' };
        case 'teleop':
            return { text: 'text-green-400', bg: 'bg-green-400' };
        case 'endgame':
            return { text: 'text-red-400', bg: 'bg-red-400' };
        case 'post-match':
            return { text: 'text-white/50', bg: 'bg-white/50' };
        default:
            return { text: 'text-white/70', bg: 'bg-white/30' };
    }
}

function getAllianceScore(match: CompetitionMatch, color: string): number {
    if (!match.match_alliances || match.match_alliances.length === 0) {
        return 0;
    }

    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance?.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + (ma.score || 0), 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.score_type?.points || 0), 0);

    const total = teamScore + allianceWideScore;

    return total;
}

type WinnerState = { winner: 'red' | 'blue' | 'tie'; redScore: number; blueScore: number; match: CompetitionMatch; matchId: number } | null;

export default function MatchControl() {
    const { data: activeMatch } = useActiveMatch(500);
    const { data: polledLoadedMatch } = useLoadedMatch(500);
    const { data: match } = useMatch(activeMatch?.id ?? null, 500);
    const [winnerState, setWinnerState] = useState<WinnerState>(null);
    const [echoLoadedMatch, setEchoLoadedMatch] = useState<CompetitionMatch | null>(null);
    const lastEndedMatchRef = useRef<number | null>(null);
    const [lastRunningMatch, setLastRunningMatch] = useState<CompetitionMatch | null>(null);

    const loadedMatch = echoLoadedMatch ?? polledLoadedMatch ?? null;

    const api = useApi();
    const queryClient = useQueryClient();
    const { playSound } = useAudioEngine();

    // Handle match end from timer
    const handleMatchEnd = useCallback(() => {
        if (match && match.match_alliances.length > 0) {
            // Immediately show winner when timer ends
            const red = getAllianceScore(match, 'red');
            const blue = getAllianceScore(match, 'blue');
            const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';

            console.log('[Timer End] Showing winner:', { winner, red, blue, matchId: match.id });
            setWinnerState({ winner, redScore: red, blueScore: blue, match, matchId: match.id });
            lastEndedMatchRef.current = match.id;

            // Also invalidate queries to get the latest match data
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['active-match'] });
        }
    }, [match, queryClient]);

    const timer = useMatchTimer({ playSound, onMatchEnd: handleMatchEnd });
    const lastStartedMatchIdRef = useRef<number | null>(null);

    // On mount, check if there's a recently completed match to show winner for
    useEffect(() => {
        api.getMatches()
            .then((matches) => {
                const completed = matches.filter((m) => m.status === 'completed' && m.ended_at);
                const recentlyCompleted = completed.sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

                if (recentlyCompleted) {
                    const endedAt = new Date(recentlyCompleted.ended_at!);
                    const secondsSinceEnd = (new Date().getTime() - endedAt.getTime()) / 1000;

                    if (secondsSinceEnd < 60) {
                        const red = getAllianceScore(recentlyCompleted, 'red');
                        const blue = getAllianceScore(recentlyCompleted, 'blue');
                        const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';
                        setWinnerState({ winner, redScore: red, blueScore: blue, match: recentlyCompleted, matchId: recentlyCompleted.id });
                    }
                }
            })
            .catch(() => {
                // Silently fail
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear winner screen ONLY when a different match is loaded
    useEffect(() => {
        if (!winnerState) {
            console.log('[Clear Winner] No winner state');
            return;
        }

        const loadedId = loadedMatch?.id;
        const winnerId = winnerState.matchId;

        console.log('[Clear Winner] Check:', { loadedId, winnerId });

        // Clear ONLY if a different match is loaded AND loadedId is valid
        if (loadedMatch && loadedId && loadedId !== winnerId) {
            console.log('[Clear Winner] ❌ CLEARING - different match loaded');
            setWinnerState(null);
            setLastRunningMatch(null);
        } else {
            console.log('[Clear Winner] ✅ Keeping winner visible');
        }
    }, [loadedMatch, activeMatch, winnerState]);

    // Track the last running match so we can show winner even after match ends
    useEffect(() => {
        if (timer.isRunning && match && match.match_alliances.length > 0) {
            console.log('[Track Match] Saving running match:', match.id);
            setLastRunningMatch(match);
        }
    }, [timer.isRunning, match]);

    // When timer reaches post-match, wait for match to be completed and show winner with final scores
    useEffect(() => {
        if (timer.phase !== 'post-match' || winnerState) {
            return;
        }

        const matchId = lastRunningMatch?.id;
        if (!matchId || lastEndedMatchRef.current === matchId) {
            return;
        }

        console.log('[Post-Match] Timer ended, waiting for match to be completed with final scores...');

        // Poll for the completed match with final scores
        const checkInterval = setInterval(() => {
            api.getMatches()
                .then((matches) => {
                    const completedMatch = matches.find((m) => m.id === matchId && m.status === 'completed' && m.ended_at);

                    if (completedMatch && completedMatch.match_alliances.length > 0) {
                        console.log('[Post-Match] ✅ Found completed match with scores:', {
                            matchId: completedMatch.id,
                            matchNumber: completedMatch.number,
                            allianceCount: completedMatch.match_alliances.length,
                        });

                        const red = getAllianceScore(completedMatch, 'red');
                        const blue = getAllianceScore(completedMatch, 'blue');
                        const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';

                        console.log('[Post-Match] ⭐ Setting winner with matchId:', completedMatch.id, 'winner:', winner, 'scores:', red, '-', blue);

                        const winnerData = { winner, redScore: red, blueScore: blue, match: completedMatch, matchId: completedMatch.id };
                        setWinnerState(winnerData);
                        lastEndedMatchRef.current = completedMatch.id;

                        clearInterval(checkInterval);
                    }
                })
                .catch((error) => {
                    console.error('[Post-Match] Error fetching matches:', error);
                });
        }, 500);

        // Cleanup interval after 30 seconds if match never completes
        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            console.log('[Post-Match] Timeout waiting for completed match');
        }, 30000);

        return () => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
        };
    }, [timer.phase, winnerState, lastRunningMatch, api]);

    // Auto-resume timer when an active match exists, stop when no longer ongoing
    useEffect(() => {
        if (activeMatch && activeMatch.status === 'ongoing' && activeMatch.started_at) {
            if (!timer.isRunning && lastStartedMatchIdRef.current !== activeMatch.id) {
                console.log('[Timer Resume] Resuming timer for match:', activeMatch.id);
                timer.resumeFrom(activeMatch.started_at);
                lastStartedMatchIdRef.current = activeMatch.id; // Mark as started to prevent duplicate resumes
            }
        } else if (timer.isRunning) {
            // Use stop() instead of cancel() - the match ended normally, not cancelled
            timer.stop();
        }
    }, [activeMatch, timer]);

    // Winner detection: check for recently completed matches on every change
    useEffect(() => {
        console.log('[Winner Detection] Effect running', { activeMatch: activeMatch?.id, winnerState: winnerState?.matchId });

        api.getMatches()
            .then((matches) => {
                console.log('[Winner Detection] Got matches:', matches.length);
                const completed = matches.filter((m) => m.status === 'completed' && m.ended_at);
                console.log('[Winner Detection] Completed matches:', completed.length);

                if (completed.length === 0) {
                    return;
                }

                const recentlyCompleted = completed.sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

                const endedAt = new Date(recentlyCompleted.ended_at!);
                const secondsSinceEnd = (new Date().getTime() - endedAt.getTime()) / 1000;

                console.log('[Winner Detection] Most recent:', {
                    matchId: recentlyCompleted.id,
                    matchNumber: recentlyCompleted.number,
                    secondsSinceEnd,
                    lastEndedMatchRef: lastEndedMatchRef.current,
                    hasAlliances: !!recentlyCompleted.match_alliances,
                    allianceCount: recentlyCompleted.match_alliances?.length,
                });

                // Only show winner if match ended recently and it's a different match than currently shown
                // Skip if this is the lastRunningMatch (post-match polling will handle it)
                const isLastRunningMatch = lastRunningMatch && recentlyCompleted.id === lastRunningMatch.id;

                console.log('[Winner Detection] Conditions check:', {
                    secondsSinceEnd,
                    withinTimeWindow: secondsSinceEnd < 60,
                    lastEndedMatchRef: lastEndedMatchRef.current,
                    recentlyCompletedId: recentlyCompleted.id,
                    notAlreadyShown: lastEndedMatchRef.current !== recentlyCompleted.id,
                    isLastRunningMatch,
                    willShowWinner: secondsSinceEnd < 60 && lastEndedMatchRef.current !== recentlyCompleted.id && !isLastRunningMatch,
                });

                if (secondsSinceEnd < 60 && lastEndedMatchRef.current !== recentlyCompleted.id && !isLastRunningMatch) {
                    lastEndedMatchRef.current = recentlyCompleted.id;

                    const red = getAllianceScore(recentlyCompleted, 'red');
                    const blue = getAllianceScore(recentlyCompleted, 'blue');
                    const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';

                    console.log('[Winner Detection] ⭐ Setting winner state - Match:', recentlyCompleted.id, 'Winner:', winner, 'Scores:', red, '-', blue);

                    const winnerData = { winner, redScore: red, blueScore: blue, match: recentlyCompleted, matchId: recentlyCompleted.id };
                    console.log('[Winner Detection] ⭐ Setting winner with matchId:', recentlyCompleted.id);
                    setWinnerState(winnerData);
                } else {
                    console.log('[Winner Detection] Skipping - conditions not met');
                }
            })
            .catch((error) => {
                console.error('[Winner Detection] Error:', error);
            });
    }, [activeMatch, winnerState, api]);

    // WebSocket disabled - using polling instead for simplicity
    // Listen to match-control channel for sync
    // useEcho<MatchStatusChangedEvent>('match-control', 'MatchStatusChanged', (event) => {
    //     console.log('[WebSocket] MatchStatusChanged event received:', {
    //         action: event.action,
    //         matchId: event.match?.id,
    //     });

    //     queryClient.invalidateQueries({ queryKey: ['matches'] });
    //     queryClient.invalidateQueries({ queryKey: ['active-match'] });
    //     queryClient.invalidateQueries({ queryKey: ['loaded-match'] });

    //     if (event.action === 'loaded') {
    //         setEchoLoadedMatch(event.match);
    //     } else if (event.action === 'started' && event.match.started_at) {
    //         setEchoLoadedMatch(null);
    //         setWinnerState(null);
    //         lastStartedMatchIdRef.current = event.match.id;
    //         timer.start();
    //     } else if (event.action === 'ended') {
    //         console.log('[WebSocket] Match ended - full event data:', {
    //             matchId: event.match.id,
    //             hasAlliances: !!event.match.match_alliances,
    //             allianceCount: event.match.match_alliances?.length || 0,
    //             hasScores: !!event.match.scores,
    //             scoreCount: event.match.scores?.length || 0,
    //             scores: event.match.scores,
    //             matchAlliances: event.match.match_alliances,
    //         });
    //         timer.cancel();
    //         if (lastEndedMatchRef.current !== event.match.id) {
    //             lastEndedMatchRef.current = event.match.id;
    //             const red = getAllianceScore(event.match, 'red');
    //             const blue = getAllianceScore(event.match, 'blue');
    //             console.log('[WebSocket] Final calculated scores:', { red, blue });
    //             const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';
    //             console.log('[WebSocket] Setting winner state:', { winner, redScore: red, blueScore: blue });
    //             setWinnerState({ winner, redScore: red, blueScore: blue, match: event.match });
    //         }
    //     } else if (event.action === 'cancelled') {
    //         timer.cancel();
    //         setWinnerState(null);
    //     }
    // });

    const phaseColors = getPhaseColors(timer.phase);
    const redScore = match ? getAllianceScore(match, 'red') : 0;
    const blueScore = match ? getAllianceScore(match, 'blue') : 0;
    const redTeams = match?.match_alliances.filter((ma) => ma.alliance.color === 'red') ?? [];
    const blueTeams = match?.match_alliances.filter((ma) => ma.alliance.color === 'blue') ?? [];

    // Winner overlay
    if (winnerState) {
        const winRedTeams = winnerState.match.match_alliances.filter((ma) => ma.alliance.color === 'red');
        const winBlueTeams = winnerState.match.match_alliances.filter((ma) => ma.alliance.color === 'blue');

        return (
            <div
                className={cn(
                    'flex h-screen w-screen flex-col items-center justify-center overflow-hidden',
                    winnerState.winner === 'red' && 'bg-gradient-to-br from-red-900 via-red-800 to-red-950',
                    winnerState.winner === 'blue' && 'bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950',
                    winnerState.winner === 'tie' && 'bg-gradient-to-br from-purple-900 via-purple-800 to-purple-950',
                )}
            >
                <Head title="Match Result" />

                {/* Animated background glow */}
                <div
                    className={cn(
                        'absolute inset-0 animate-pulse opacity-20',
                        winnerState.winner === 'red' && 'bg-red-500',
                        winnerState.winner === 'blue' && 'bg-blue-500',
                        winnerState.winner === 'tie' && 'bg-purple-500',
                    )}
                />

                <div className="relative z-10 flex flex-col items-center gap-8">
                    {/* Match number */}
                    <p className="text-2xl font-semibold tracking-widest text-white/60 uppercase">Match #{winnerState.match.number} - Final Result</p>

                    {/* Winner announcement */}
                    <div className="animate-bounce">
                        {winnerState.winner === 'tie' ? (
                            <h1 className="text-8xl font-black tracking-tight text-white drop-shadow-lg">IT&apos;S A TIE!</h1>
                        ) : (
                            <h1 className="text-8xl font-black tracking-tight text-white drop-shadow-lg">
                                {winnerState.winner === 'red' ? 'RED' : 'BLUE'} ALLIANCE WINS!
                            </h1>
                        )}
                    </div>

                    {/* Scores side by side */}
                    <div className="flex items-center gap-12">
                        <div
                            className={cn(
                                'flex flex-col items-center rounded-3xl border-4 p-8 transition-all',
                                winnerState.winner === 'red'
                                    ? 'scale-110 border-red-400 bg-red-500/30 shadow-2xl shadow-red-500/50'
                                    : 'border-red-500/30 bg-red-500/10',
                            )}
                        >
                            <span className="mb-1 text-xl font-bold text-red-300">RED ALLIANCE</span>
                            <span className="text-8xl font-black text-white">{winnerState.redScore}</span>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {winRedTeams.map((ma) => (
                                    <span key={ma.id} className="rounded-full bg-red-500/30 px-4 py-1.5 text-base font-medium text-red-200">
                                        {ma.team.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <span className="text-6xl font-black text-white/30">VS</span>

                        <div
                            className={cn(
                                'flex flex-col items-center rounded-3xl border-4 p-8 transition-all',
                                winnerState.winner === 'blue'
                                    ? 'scale-110 border-blue-400 bg-blue-500/30 shadow-2xl shadow-blue-500/50'
                                    : 'border-blue-500/30 bg-blue-500/10',
                            )}
                        >
                            <span className="mb-1 text-xl font-bold text-blue-300">BLUE ALLIANCE</span>
                            <span className="text-8xl font-black text-white">{winnerState.blueScore}</span>
                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                {winBlueTeams.map((ma) => (
                                    <span key={ma.id} className="rounded-full bg-blue-500/30 px-4 py-1.5 text-base font-medium text-blue-200">
                                        {ma.team.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Next match hint */}
                    <p className="mt-8 text-lg text-white/50">Load the next match to continue</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
            <Head title="Match Display" />

            {/* Header */}
            <div className="border-b border-white/10 bg-white/5 px-8 py-4">
                <h1 className="text-center text-2xl font-bold text-white">{match ? `MATCH #${match.number}` : 'WAITING FOR MATCH'}</h1>
            </div>

            {/* Timer Section */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
                {timer.phase !== 'pre-match' && (
                    <>
                        {/* Phase Label - hidden during transition */}
                        {timer.phase !== 'transition' && (
                            <div className={cn('text-3xl font-black tracking-[0.3em]', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}>
                                {getPhaseLabel(timer.phase)}
                            </div>
                        )}

                        {/* Main Timer */}
                        {timer.phase === 'transition' ? (
                            <div className="text-[10rem] leading-none font-black text-orange-400 tabular-nums animate-pulse">
                                {timer.phaseRemainingSeconds}
                            </div>
                        ) : (
                            <div className="text-[10rem] leading-none font-black text-white tabular-nums">
                                {formatTime(timer.phase === 'autonomous' ? timer.remainingSeconds - 10 : timer.remainingSeconds)}
                            </div>
                        )}

                        {/* Phase Time - hidden during transition */}
                        {timer.isRunning && timer.phase !== 'transition' && (
                            <div className="text-xl text-white/60">Phase time remaining: {formatTime(timer.phaseRemainingSeconds)}</div>
                        )}
                    </>
                )}

                {/* Progress Bar */}
                <div className="h-4 w-full max-w-2xl overflow-hidden rounded-full bg-white/10">
                    <div
                        className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)}
                        style={{ width: `${timer.progressPercent}%` }}
                    />
                </div>

                {/* Alliance Scores */}
                {match && match.match_alliances.length > 0 && (
                    <div className="mt-4 flex w-full max-w-2xl gap-6">
                        <div className="flex flex-1 flex-col items-center rounded-2xl border-2 border-red-500 bg-red-500/10 p-6">
                            <span className="mb-2 text-lg font-semibold text-red-400">Red Alliance</span>
                            <span className="text-6xl font-black text-white">{redScore}</span>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                {redTeams.map((ma) => (
                                    <span key={ma.id} className="rounded-full bg-red-500/20 px-3 py-1 text-sm text-red-300">
                                        {ma.team.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-1 flex-col items-center rounded-2xl border-2 border-blue-500 bg-blue-500/10 p-6">
                            <span className="mb-2 text-lg font-semibold text-blue-400">Blue Alliance</span>
                            <span className="text-6xl font-black text-white">{blueScore}</span>
                            <div className="mt-3 flex flex-wrap justify-center gap-2">
                                {blueTeams.map((ma) => (
                                    <span key={ma.id} className="rounded-full bg-blue-500/20 px-3 py-1 text-sm text-blue-300">
                                        {ma.team.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Loaded match preview or waiting message */}
                {!match &&
                    !timer.isRunning &&
                    (loadedMatch?.match_alliances ? (
                        <div className="mt-4 flex w-full max-w-2xl flex-col items-center gap-6">
                            <p className="text-2xl font-bold text-white">NEXT UP - Match #{loadedMatch.number}</p>
                            <div className="flex w-full gap-6">
                                <div className="flex flex-1 flex-col items-center rounded-2xl border-2 border-red-500 bg-red-500/10 p-6">
                                    <span className="mb-3 text-lg font-semibold text-red-400">Red Alliance</span>
                                    <div className="flex flex-col items-center gap-2">
                                        {loadedMatch.match_alliances
                                            .filter((ma) => ma.alliance.color === 'red')
                                            .map((ma) => (
                                                <span key={ma.id} className="text-2xl font-bold text-white">
                                                    {ma.team.name}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                                <div className="flex items-center text-4xl font-black text-white/30">VS</div>
                                <div className="flex flex-1 flex-col items-center rounded-2xl border-2 border-blue-500 bg-blue-500/10 p-6">
                                    <span className="mb-3 text-lg font-semibold text-blue-400">Blue Alliance</span>
                                    <div className="flex flex-col items-center gap-2">
                                        {loadedMatch.match_alliances
                                            .filter((ma) => ma.alliance.color === 'blue')
                                            .map((ma) => (
                                                <span key={ma.id} className="text-2xl font-bold text-white">
                                                    {ma.team.name}
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-4 text-xl text-white/40">Waiting for a match to be loaded...</p>
                    ))}
            </div>
        </div>
    );
}
