import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useApi } from '@/hooks/use-api';
import { useAudioEngine } from '@/hooks/use-audio-engine';
import { useLoadedMatch, useMatch } from '@/hooks/use-match';
import { determineWinner, formatTime, getAllianceMembers, getAllianceScore, getPhaseColors, getPhaseLabel } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type MatchStatusChangedEvent } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

type WinnerState = { winner: 'red' | 'blue' | 'tie'; redScore: number; blueScore: number; match: CompetitionMatch; matchId: number } | null;

function winnerStateFrom(match: CompetitionMatch): WinnerState {
    return {
        winner: determineWinner(match),
        redScore: getAllianceScore(match, 'red'),
        blueScore: getAllianceScore(match, 'blue'),
        match,
        matchId: match.id,
    };
}

export default function MatchControl() {
    // Safety-net poll — MatchStatusChanged (below) is the primary sync path; this only
    // covers a missed broadcast (e.g. a dropped Reverb connection).
    const { data: loadedMatch } = useLoadedMatch(5000);
    const [winnerState, setWinnerState] = useState<WinnerState>(null);
    const lastEndedMatchRef = useRef<number | null>(null);

    const api = useApi();
    const queryClient = useQueryClient();
    const { playSound } = useAudioEngine();

    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound });
    const { data: match } = useMatch(activeMatch?.id ?? null, 5000);

    // On mount, check if there's a recently completed match to show winner for
    // (covers a page load that lands right after a match ended, before any broadcast
    // could reach this client). One-off authoritative snapshot fetch, not polling.
    useEffect(() => {
        api.getMatches()
            .then((matches) => {
                const hasOngoingMatch = matches.some((m) => m.status === 'ongoing');
                if (hasOngoingMatch) {
                    return;
                }

                const completed = matches.filter((m) => m.status === 'completed' && m.ended_at);
                const recentlyCompleted = completed.sort((a, b) => new Date(b.ended_at!).getTime() - new Date(a.ended_at!).getTime())[0];

                if (!recentlyCompleted) {
                    return;
                }

                const secondsSinceEnd = (Date.now() - new Date(recentlyCompleted.ended_at!).getTime()) / 1000;
                if (secondsSinceEnd < 60) {
                    lastEndedMatchRef.current = recentlyCompleted.id;
                    setWinnerState(winnerStateFrom(recentlyCompleted));
                }
            })
            .catch(() => {
                // Silently fail
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Clear the winner screen once a different match is staged or already running.
    useEffect(() => {
        if (!winnerState) {
            return;
        }

        if ((loadedMatch && loadedMatch.id !== winnerState.matchId) || (activeMatch && activeMatch.id !== winnerState.matchId)) {
            setWinnerState(null);
        }
    }, [loadedMatch, activeMatch, winnerState]);

    // Primary sync path: the server broadcasts every match-control action as it
    // happens, carrying the full match (final scores included on 'ended'), so the
    // client never needs to poll or guess at state — it just applies the event.
    useEcho<MatchStatusChangedEvent>('match-control', 'MatchStatusChanged', (event) => {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['active-match'] });

        switch (event.action) {
            case 'loaded':
                queryClient.setQueryData(['loaded-match'], event.match);
                break;
            case 'started':
                queryClient.invalidateQueries({ queryKey: ['loaded-match'] });
                setWinnerState(null);
                break;
            case 'ended':
                if (lastEndedMatchRef.current !== event.match.id) {
                    lastEndedMatchRef.current = event.match.id;
                    setWinnerState(winnerStateFrom(event.match));
                }
                break;
            case 'cancelled':
                queryClient.invalidateQueries({ queryKey: ['loaded-match'] });
                setWinnerState(null);
                break;
        }
    });

    const phaseColors = useMemo(() => getPhaseColors(timer.phase), [timer.phase]);
    const redScore = useMemo(() => (match ? getAllianceScore(match, 'red') : 0), [match]);
    const blueScore = useMemo(() => (match ? getAllianceScore(match, 'blue') : 0), [match]);
    const redTeams = useMemo(() => (match ? getAllianceMembers(match, 'red') : []), [match]);
    const blueTeams = useMemo(() => (match ? getAllianceMembers(match, 'blue') : []), [match]);

    // Winner overlay
    if (winnerState) {
        const winRedTeams = getAllianceMembers(winnerState.match, 'red');
        const winBlueTeams = getAllianceMembers(winnerState.match, 'blue');

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
                {timer.phase !== 'pre-match' ? (
                    <>
                        {/* Phase Label - hidden during transition */}
                        {timer.phase !== 'transition' ? (
                            <div className={cn('text-3xl font-black tracking-[0.3em]', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}>
                                {getPhaseLabel(timer.phase)}
                            </div>
                        ) : null}

                        {/* Main Timer */}
                        {timer.phase === 'transition' ? (
                            <div className="text-[10rem] leading-none font-black text-orange-400 tabular-nums animate-pulse">
                                {timer.phaseRemainingSeconds}
                            </div>
                        ) : timer.phase === 'autonomous' ? (
                            <div className="text-[10rem] leading-none font-black text-white tabular-nums">
                                {formatTime(timer.phaseRemainingSeconds + (matchConfig?.timing.teleop ?? 120))}
                            </div>
                        ) : (
                            <div className="text-[10rem] leading-none font-black text-white tabular-nums">
                                {formatTime(timer.phaseRemainingSeconds)}
                            </div>
                        )}

                        {/* Phase Time - hidden during transition */}
                        {timer.isRunning && timer.phase !== 'transition' ? (
                            <div className="text-xl text-white/60">Phase time remaining: {formatTime(timer.phaseRemainingSeconds)}</div>
                        ) : null}
                    </>
                ) : null}

                {/* Progress Bar */}
                <div className="h-4 w-full max-w-2xl overflow-hidden rounded-full bg-white/10">
                    <div
                        className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)}
                        style={{ width: `${timer.progressPercent}%` }}
                    />
                </div>

                {/* Alliance Scores */}
                {match && match.match_alliances.length > 0 ? (
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
                ) : null}

                {/* Loaded match preview or waiting message */}
                {!match && !timer.isRunning ? (
                    loadedMatch?.match_alliances ? (
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
                    )
                ) : null}
            </div>
        </div>
    );
}
