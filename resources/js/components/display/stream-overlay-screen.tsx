import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { type SoundName } from '@/hooks/use-audio-engine';
import { useLoadedMatch, useMatch } from '@/hooks/use-match';
import { eventChannel } from '@/lib/event';
import { formatTime, getAllianceScore, getPhaseLabel } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type MatchPhase, type MatchStatusChangedEvent } from '@/types';
import { Head } from '@inertiajs/react';
import { useEchoPublic } from '@laravel/echo-react';
import { useQueryClient } from '@tanstack/react-query';
import { Bot, Hand, Joystick, Radio, Zap } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';

/**
 * Broadcast-style phase treatment: icon + accent color per match phase.
 * Kept local to the overlay (distinct from the admin-facing getPhaseColors)
 * since this needs a richer palette (glow color, ring color) for the HUD look.
 */
const PHASE_STYLE: Record<MatchPhase, { icon: typeof Bot; accent: string; bar: string; ring: string; glow: string }> = {
    'pre-match': { icon: Radio, accent: 'text-slate-300', bar: 'bg-slate-400', ring: 'ring-slate-500/40', glow: 'shadow-slate-500/20' },
    autonomous: { icon: Bot, accent: 'text-amber-300', bar: 'bg-amber-400', ring: 'ring-amber-400/60', glow: 'shadow-amber-400/40' },
    transition: { icon: Hand, accent: 'text-orange-300', bar: 'bg-orange-400', ring: 'ring-orange-400/60', glow: 'shadow-orange-400/40' },
    teleop: { icon: Joystick, accent: 'text-cyan-300', bar: 'bg-cyan-400', ring: 'ring-cyan-400/60', glow: 'shadow-cyan-400/40' },
    endgame: { icon: Zap, accent: 'text-rose-300', bar: 'bg-rose-500', ring: 'ring-rose-400/70', glow: 'shadow-rose-400/50' },
    'post-match': { icon: Radio, accent: 'text-white/60', bar: 'bg-white/50', ring: 'ring-white/30', glow: 'shadow-white/10' },
};

export function StreamOverlayScreen({ playSound }: { playSound?: (name: SoundName) => void }) {
    const queryClient = useQueryClient();
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound });
    // Safety-net poll — MatchStatusChanged (below) is the primary sync path; this only
    // covers a missed broadcast (e.g. a dropped Reverb connection).
    const { data: loadedMatch } = useLoadedMatch(5000);
    const { data: match } = useMatch(activeMatch?.id ?? null, 5000);
    const lastEndedMatchIdRef = useRef<number | null>(null);

    useEchoPublic<MatchStatusChangedEvent>(eventChannel('match-control'), 'MatchStatusChanged', (event) => {
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['active-match'] });

        if (event.action === 'loaded' && event.match) {
            queryClient.setQueryData(['loaded-match'], event.match);
        } else {
            queryClient.invalidateQueries({ queryKey: ['loaded-match'] });
        }
    });

    // Track the running match ID before it ends so we can show final scores
    useEffect(() => {
        if (timer.isRunning && match?.id) {
            lastEndedMatchIdRef.current = match.id;
        }
    }, [timer.isRunning, match?.id]);

    // Keep the final score up until the operator loads a different match, then return to pre-match.
    useEffect(() => {
        if (!loadedMatch || loadedMatch.id === lastEndedMatchIdRef.current) {
            return;
        }

        lastEndedMatchIdRef.current = null;

        if (!activeMatch && timer.phase === 'post-match') {
            timer.reset();
        }
    }, [loadedMatch, activeMatch, timer]);

    // Fetch the last ended match data to show final scores
    const { data: endedMatch } = useMatch(lastEndedMatchIdRef.current, 5000);

    // Use the appropriate match data based on state
    const displayMatch = match || (timer.phase === 'post-match' && endedMatch) || loadedMatch;

    const phaseStyle = PHASE_STYLE[timer.phase];
    const PhaseIcon = phaseStyle.icon;
    const redScore = useMemo(() => (displayMatch ? getAllianceScore(displayMatch, 'red') : 0), [displayMatch]);
    const blueScore = useMemo(() => (displayMatch ? getAllianceScore(displayMatch, 'blue') : 0), [displayMatch]);
    const redTeams = useMemo(() => displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'red') ?? [], [displayMatch]);
    const blueTeams = useMemo(() => displayMatch?.match_alliances?.filter((ma) => ma.alliance.color === 'blue') ?? [], [displayMatch]);

    // Check if match is loaded but not started
    const isMatchLoaded = loadedMatch && !activeMatch && timer.phase === 'pre-match';

    const displayTime =
        timer.phase === 'transition'
            ? String(timer.phaseRemainingSeconds)
            : timer.phase === 'autonomous'
              ? formatTime(timer.phaseRemainingSeconds + (matchConfig?.timing.teleop ?? 120))
              : formatTime(timer.phaseRemainingSeconds);

    return (
        <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-black">
            <Head title="Stream Overlay" />

            {/* Chroma key field — keep this region pure #00ff00, nothing opaque may sit inside it */}
            <div className="relative h-[75vh] w-full bg-[#00ff00]">
                {/* Match tag straddles the seam so it reads as one HUD, not two stacked boxes */}
                {displayMatch && (
                    <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
                        <div
                            className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950 px-6 py-1.5 shadow-[0_0_24px_rgba(0,0,0,0.6)]"
                            style={{ fontFamily: 'var(--font-scoreboard)' }}
                        >
                            <span
                                className={cn(
                                    'inline-block h-2 w-2 rounded-full',
                                    timer.isRunning && 'animate-pulse',
                                    phaseStyle.accent.replace('text-', 'bg-'),
                                )}
                            />
                            <span className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">Match {displayMatch.number}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Scorebug — the only opaque UI, everything above must stay keyable */}
            <div className="relative flex h-[25vh] w-full items-stretch justify-between overflow-hidden bg-gradient-to-b from-[#0b0f1a] to-[#020306]">
                {/* HUD seam light: a thin tri-color glow marking the field/scorebug boundary */}
                <div className="absolute top-0 right-0 left-0 h-px bg-gradient-to-r from-red-500/0 via-white/40 to-blue-500/0" />

                {/* Red panel — angled trailing edge leaning toward center */}
                <div
                    className="relative flex flex-1 items-center gap-5 bg-gradient-to-br from-red-600 via-red-700 to-red-900 py-4 pr-16 pl-10 shadow-[inset_0_0_60px_rgba(0,0,0,0.35)]"
                    style={{ clipPath: 'polygon(0 0, 100% 0, calc(100% - 3.5rem) 100%, 0 100%)' }}
                >
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: 'repeating-linear-gradient(115deg, #fff 0 2px, transparent 2px 14px)' }}
                    />
                    <span
                        className="text-8xl leading-none font-semibold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                        style={{ fontFamily: 'var(--font-scoreboard-display)' }}
                    >
                        {redScore}
                    </span>
                    <div className="flex flex-col gap-1.5">
                        {redTeams.map((ma) => (
                            <div key={ma.id} className="flex items-baseline gap-2">
                                <span className="rounded bg-black/25 px-2 py-0.5 text-lg font-bold text-white tabular-nums">{ma.team.number}</span>
                                <span className="truncate text-sm font-medium text-red-100/80">{ma.team.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: phase + timer */}
                <div className="relative z-10 flex w-[26rem] shrink-0 flex-col items-center justify-center gap-1 px-4 pt-3">
                    <div
                        className={cn(
                            'flex items-center gap-2 rounded-full bg-white/5 px-4 py-1 ring-1 backdrop-blur-sm transition-colors duration-300',
                            phaseStyle.ring,
                        )}
                    >
                        <PhaseIcon className={cn('h-4 w-4', phaseStyle.accent, timer.phase === 'endgame' && 'animate-pulse')} />
                        <span className={cn('text-xs font-bold tracking-[0.25em] uppercase', phaseStyle.accent)}>
                            {isMatchLoaded ? 'Ready' : timer.phase === 'post-match' ? 'Final' : getPhaseLabel(timer.phase)}
                        </span>
                    </div>

                    {timer.phase === 'post-match' ? (
                        <div
                            className="animate-in fade-in zoom-in-95 text-7xl leading-none font-semibold text-white/90 duration-500"
                            style={{ fontFamily: 'var(--font-scoreboard-display)' }}
                        >
                            {redScore === blueScore ? 'TIE' : redScore > blueScore ? 'RED WINS' : 'BLUE WINS'}
                        </div>
                    ) : isMatchLoaded ? (
                        <div className="mt-1 flex flex-col items-center gap-0.5">
                            <div
                                className="text-5xl leading-none font-semibold text-emerald-300 tabular-nums"
                                style={{ fontFamily: 'var(--font-scoreboard-display)' }}
                            >
                                0:00
                            </div>
                            <span className="text-xs font-medium text-white/40">On deck</span>
                        </div>
                    ) : displayMatch ? (
                        <div
                            className={cn(
                                'text-8xl leading-none font-semibold tabular-nums transition-colors duration-300',
                                timer.phase === 'endgame' ? 'text-rose-300' : 'text-white',
                            )}
                            style={{ fontFamily: 'var(--font-scoreboard-display)' }}
                        >
                            {displayTime}
                        </div>
                    ) : (
                        <span className="mt-3 text-sm font-medium tracking-wide text-white/40">Waiting for match…</span>
                    )}

                    {/* Progress rail */}
                    <div className="mt-1 h-2 w-64 overflow-hidden rounded-full bg-white/15">
                        <div
                            className={cn('h-full rounded-full transition-[width] duration-300 ease-linear', phaseStyle.bar)}
                            style={{
                                width: `${isMatchLoaded ? 0 : timer.progressPercent}%`,
                                backgroundImage: 'repeating-linear-gradient(115deg, rgba(0,0,0,0.25) 0 4px, transparent 4px 10px)',
                            }}
                        />
                    </div>
                </div>

                {/* Blue panel — mirrored angle */}
                <div
                    className="relative flex flex-1 items-center justify-end gap-5 bg-gradient-to-bl from-blue-600 via-blue-700 to-blue-900 py-4 pr-10 pl-16 text-right shadow-[inset_0_0_60px_rgba(0,0,0,0.35)]"
                    style={{ clipPath: 'polygon(3.5rem 0, 100% 0, 100% 100%, 0 100%)' }}
                >
                    <div
                        className="pointer-events-none absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: 'repeating-linear-gradient(65deg, #fff 0 2px, transparent 2px 14px)' }}
                    />
                    <div className="flex flex-col items-end gap-1.5">
                        {blueTeams.map((ma) => (
                            <div key={ma.id} className="flex items-baseline gap-2">
                                <span className="truncate text-sm font-medium text-blue-100/80">{ma.team.name}</span>
                                <span className="rounded bg-black/25 px-2 py-0.5 text-lg font-bold text-white tabular-nums">{ma.team.number}</span>
                            </div>
                        ))}
                    </div>
                    <span
                        className="text-8xl leading-none font-semibold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]"
                        style={{ fontFamily: 'var(--font-scoreboard-display)' }}
                    >
                        {blueScore}
                    </span>
                </div>
            </div>
        </div>
    );
}
