import { useMatchTimer } from '@/hooks/use-match-timer';
import { useActiveMatch, useLoadedMatch, useMatch } from '@/hooks/use-match';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type MatchPhase, type MatchStatusChangedEvent } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
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
    const allianceTeams = match.match_alliances.filter((ma) => ma.alliance.color === color);
    const teamScore = allianceTeams.reduce((sum, ma) => sum + ma.score, 0);

    const allianceIds = [...new Set(allianceTeams.map((ma) => ma.alliance.id))];
    const allianceWideScore = (match.scores || [])
        .filter((s) => !s.team_id && allianceIds.includes(s.alliance_id ?? -1))
        .reduce((sum, s) => sum + (s.score_type?.points || 0), 0);

    return teamScore + allianceWideScore;
}

type WinnerState = { winner: 'red' | 'blue' | 'tie'; redScore: number; blueScore: number; match: CompetitionMatch } | null;

export default function MatchControl() {
    const { data: activeMatch } = useActiveMatch(3000);
    const { data: polledLoadedMatch } = useLoadedMatch(3000);
    const { data: match } = useMatch(activeMatch?.id ?? null, 3000);
    const [winnerState, setWinnerState] = useState<WinnerState>(null);
    const [echoLoadedMatch, setEchoLoadedMatch] = useState<CompetitionMatch | null>(null);
    const lastEndedMatchRef = useRef<number | null>(null);

    const loadedMatch = echoLoadedMatch ?? polledLoadedMatch ?? null;

    const queryClient = useQueryClient();
    const timer = useMatchTimer();
    const startSoundPendingRef = useRef(false);
    const startSoundRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        const audio = new Audio('/sounds/start_match.wav');
        audio.preload = 'auto';
        startSoundRef.current = audio;
        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    // Retry playing start sound if it hasn't played yet
    useEffect(() => {
        if (startSoundPendingRef.current && timer.isRunning) {
            const audio = startSoundRef.current;
            if (audio) {
                audio.currentTime = 0;
                audio.play().then(() => {
                    startSoundPendingRef.current = false;
                }).catch(() => {});
            }
        }
    }, [timer.elapsedSeconds, timer.isRunning]);

    // Auto-resume timer when an active match exists, stop when no longer ongoing
    useEffect(() => {
        if (activeMatch && activeMatch.status === 'ongoing' && activeMatch.started_at) {
            if (!timer.isRunning) {
                timer.resumeFrom(activeMatch.started_at);
            }
        } else if (timer.isRunning) {
            timer.cancel();
        }
    }, [activeMatch]);

    // Listen to match-control channel for sync
    useEcho<MatchStatusChangedEvent>('match-control', 'MatchStatusChanged', (event) => {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['active-match'] });
        queryClient.invalidateQueries({ queryKey: ['loaded-match'] });

        if (event.action === 'loaded') {
            setEchoLoadedMatch(event.match);
        } else if (event.action === 'started' && event.match.started_at) {
            setEchoLoadedMatch(null);
            setWinnerState(null);
            startSoundPendingRef.current = true;
            timer.start();
        } else if (event.action === 'ended') {
            timer.cancel();
            if (lastEndedMatchRef.current !== event.match.id) {
                lastEndedMatchRef.current = event.match.id;
                const red = getAllianceScore(event.match, 'red');
                const blue = getAllianceScore(event.match, 'blue');
                const winner = red > blue ? 'red' : blue > red ? 'blue' : 'tie';
                setWinnerState({ winner, redScore: red, blueScore: blue, match: event.match });
            }
        } else if (event.action === 'cancelled') {
            timer.cancel();
            setWinnerState(null);
        }
    });

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
                    <p className="text-2xl font-semibold tracking-widest text-white/60 uppercase">
                        Match #{winnerState.match.number} - Final Result
                    </p>

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

                    {/* Dismiss hint */}
                    <button
                        onClick={() => setWinnerState(null)}
                        className="mt-8 rounded-full bg-white/10 px-8 py-3 text-lg font-medium text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
            <Head title="Match Display" />

            {/* Header */}
            <div className="border-b border-white/10 bg-white/5 px-8 py-4">
                <h1 className="text-center text-2xl font-bold text-white">
                    {match ? `MATCH #${match.number}` : 'WAITING FOR MATCH'}
                </h1>
            </div>

            {/* Timer Section */}
            <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8">
                {/* Phase Label */}
                <div className={cn('text-3xl font-black tracking-[0.3em]', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}>
                    {getPhaseLabel(timer.phase)}
                </div>

                {/* Main Timer */}
                <div className="text-[10rem] leading-none font-black tabular-nums text-white">{formatTime(timer.remainingSeconds)}</div>

                {/* Phase Time */}
                {timer.isRunning && (
                    <div className="text-xl text-white/60">Phase time remaining: {formatTime(timer.phaseRemainingSeconds)}</div>
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
                {!match && !timer.isRunning && (
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
                )}
            </div>
        </div>
    );
}
