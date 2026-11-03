import { TeamChip } from '@/components/audience/team-chip';
import { AudioUnlockPrompt } from '@/components/audio-unlock-prompt';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { useAudioEngine } from '@/hooks/use-audio-engine';
import { useGroups } from '@/hooks/use-groups';
import { useMatch } from '@/hooks/use-match';
import {
    determineWinner,
    formatTime,
    getAllianceBreakdown,
    getAllianceMembers,
    getAllianceScore,
    getMatchTitle,
    getPhaseColors,
    getPhaseLabel,
} from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import AllianceSelectionDisplay from '@/pages/alliance-selection/display';
import EliminationBracketDisplay from '@/pages/elimination/bracket';
import RefereeDisplay from '@/pages/referee/display';
import { type AudienceDisplayState, type CompetitionMatch, type SharedData } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { Trophy } from 'lucide-react';

const SCREEN = 'relative flex h-screen w-screen flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white';

function BlankScreen() {
    const { event, name } = usePage<SharedData>().props;

    return (
        <div className={cn(SCREEN, 'items-center justify-center gap-4')}>
            <Head title={event?.name ?? 'Audience Display'} />
            <Trophy className="size-24 text-yellow-400/80" />
            <h1 className="text-center text-7xl font-black tracking-tight">{event?.name}</h1>
            <p className="text-2xl tracking-[0.3em] text-white/50 uppercase">{name}</p>
        </div>
    );
}

function AllianceColumn({ match, color, children }: { match: CompetitionMatch; color: 'red' | 'blue'; children?: React.ReactNode }) {
    return (
        <div
            className={cn(
                'flex flex-1 flex-col items-center gap-6 rounded-3xl border-4 p-8',
                color === 'red' ? 'border-red-500 bg-red-500/10' : 'border-blue-500 bg-blue-500/10',
            )}
        >
            <span className={cn('text-2xl font-bold tracking-widest uppercase', color === 'red' ? 'text-red-300' : 'text-blue-300')}>
                {color} alliance
            </span>
            {children}
            <div className="flex flex-wrap justify-center gap-3">
                {getAllianceMembers(match, color).map((member) => (
                    <TeamChip key={member.id} member={member} color={color} />
                ))}
            </div>
        </div>
    );
}

function PreviewScreen({ match }: { match: CompetitionMatch }) {
    return (
        <div className={cn(SCREEN, 'items-center justify-center gap-10 px-12')}>
            <Head title={`${getMatchTitle(match)} · Preview`} />
            <div className="text-center">
                <p className="text-2xl tracking-[0.3em] text-white/50 uppercase">Up next</p>
                <h1 className="text-7xl font-black">{getMatchTitle(match)}</h1>
            </div>
            <div className="flex w-full max-w-6xl items-stretch gap-8">
                <div className="flex flex-1 flex-col items-center gap-6 rounded-3xl border-4 border-red-500 bg-red-500/10 p-8">
                    <span className="text-2xl font-bold tracking-widest text-red-300 uppercase">Red alliance</span>
                    {getAllianceMembers(match, 'red').map((member) => (
                        <TeamChip key={member.id} member={member} color="red" size="lg" />
                    ))}
                </div>
                <div className="flex items-center text-6xl font-black text-white/30">VS</div>
                <div className="flex flex-1 flex-col items-center gap-6 rounded-3xl border-4 border-blue-500 bg-blue-500/10 p-8">
                    <span className="text-2xl font-bold tracking-widest text-blue-300 uppercase">Blue alliance</span>
                    {getAllianceMembers(match, 'blue').map((member) => (
                        <TeamChip key={member.id} member={member} color="blue" size="lg" />
                    ))}
                </div>
            </div>
        </div>
    );
}

function MatchScreen({
    match,
    timer,
    teleopSeconds,
}: {
    match: CompetitionMatch | undefined;
    timer: ReturnType<typeof useActiveMatchTimer>['timer'];
    teleopSeconds: number;
}) {
    const phaseColors = getPhaseColors(timer.phase);
    const clock =
        timer.phase === 'transition'
            ? String(timer.phaseRemainingSeconds)
            : timer.phase === 'autonomous'
              ? formatTime(timer.phaseRemainingSeconds + teleopSeconds)
              : formatTime(timer.phase === 'pre-match' ? 0 : timer.phaseRemainingSeconds);

    return (
        <div className={SCREEN}>
            <Head title={match ? getMatchTitle(match) : 'Match'} />
            <header className="border-b border-white/10 bg-white/5 px-8 py-4 text-center text-3xl font-bold">
                {match ? getMatchTitle(match) : 'Waiting for match'}
            </header>

            <div className="flex flex-1 items-center gap-8 px-10">
                {match && (
                    <AllianceColumn match={match} color="red">
                        <span className="text-9xl font-black tabular-nums">{getAllianceScore(match, 'red')}</span>
                    </AllianceColumn>
                )}

                <div className="flex w-[34rem] shrink-0 flex-col items-center gap-6">
                    <div className={cn('h-10 text-3xl font-black tracking-[0.3em]', phaseColors.text, timer.phase === 'endgame' && 'animate-pulse')}>
                        {timer.phase === 'pre-match' ? '' : getPhaseLabel(timer.phase)}
                    </div>
                    <div
                        className={cn(
                            'text-[9rem] leading-none font-black tabular-nums',
                            timer.phase === 'transition' ? 'animate-pulse text-orange-400' : 'text-white',
                        )}
                    >
                        {clock}
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                            className={cn('h-full rounded-full transition-all duration-300', phaseColors.bg)}
                            style={{ width: `${timer.progressPercent}%` }}
                        />
                    </div>
                </div>

                {match && (
                    <AllianceColumn match={match} color="blue">
                        <span className="text-9xl font-black tabular-nums">{getAllianceScore(match, 'blue')}</span>
                    </AllianceColumn>
                )}
            </div>
        </div>
    );
}

function ResultsScreen({ match }: { match: CompetitionMatch }) {
    const { data: groups = [] } = useGroups();
    const winner = determineWinner(match);

    return (
        <div
            className={cn(
                SCREEN,
                'items-center justify-center gap-8 px-12',
                winner === 'red' && 'from-red-950 via-red-900 to-slate-950',
                winner === 'blue' && 'from-blue-950 via-blue-900 to-slate-950',
                winner === 'tie' && 'from-purple-950 via-purple-900 to-slate-950',
            )}
        >
            <Head title={`${getMatchTitle(match)} · Results`} />
            <div className="text-center">
                <p className="text-2xl tracking-[0.3em] text-white/60 uppercase">{getMatchTitle(match)} · Results</p>
                <h1 className="text-7xl font-black drop-shadow-lg">{winner === 'tie' ? 'TIE' : `${winner.toUpperCase()} WINS`}</h1>
            </div>

            <div className="flex w-full max-w-6xl gap-8">
                {(['red', 'blue'] as const).map((color) => (
                    <AllianceColumn key={color} match={match} color={color}>
                        <span className={cn('text-9xl font-black tabular-nums', winner === color && 'text-yellow-300')}>
                            {getAllianceScore(match, color)}
                        </span>
                        <dl className="w-full max-w-sm space-y-1 text-xl">
                            {getAllianceBreakdown(match, color, groups).map((line) => (
                                <div key={line.label} className="flex justify-between border-b border-white/10 py-1">
                                    <dt className="text-white/70">{line.label}</dt>
                                    <dd className="font-bold tabular-nums">{line.points}</dd>
                                </div>
                            ))}
                        </dl>
                    </AllianceColumn>
                ))}
            </div>
        </div>
    );
}

/**
 * The one screen for projectors and TVs. Match control decides what it
 * shows; this page just follows, so a display that reloads or joins late
 * always lands on the right screen.
 */
export default function AudienceDisplay() {
    const { value: display } = useProp<AudienceDisplayState>('display');
    const { playSound, unlocked } = useAudioEngine();
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound });

    const mode = display?.mode ?? 'blank';
    const matchId = mode === 'match' ? (activeMatch?.id ?? display?.match_id ?? null) : (display?.match_id ?? null);
    const { data: match } = useMatch(matchId, 10000);

    const screen = (() => {
        switch (mode) {
            case 'preview':
                return match ? <PreviewScreen match={match} /> : <BlankScreen />;
            case 'match':
                return <MatchScreen match={match} timer={timer} teleopSeconds={matchConfig?.timing.teleop ?? 120} />;
            case 'results':
                return match ? <ResultsScreen match={match} /> : <BlankScreen />;
            case 'rankings':
                return <RefereeDisplay />;
            case 'bracket':
                return <EliminationBracketDisplay />;
            case 'alliance_selection':
                return <AllianceSelectionDisplay />;
            default:
                return <BlankScreen />;
        }
    })();

    return (
        <>
            {!unlocked && <AudioUnlockPrompt />}
            {screen}
        </>
    );
}
