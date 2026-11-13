import { AllianceSelectionScreen } from '@/components/display/alliance-selection-screen';
import { AwardScreen } from '@/components/display/award-screen';
import { DISPLAY_COLORS, EventBar, PreviewBar, ScoreBar, Stage, TeamCard, TopBar, vh, vw } from '@/components/display/display-kit';
import { InspectionScreen, KeyScreen, OnlineResultsScreen, SafetyScreen, SlideshowScreen, WifiScreen } from '@/components/display/info-screens';
import { RankingsBoard } from '@/components/display/pit-screen';
import { SponsorsScreen } from '@/components/display/sponsors-screen';
import { GameLogo, useGameLook } from '@/components/game-look';
import { useActiveMatchTimer } from '@/hooks/use-active-match-timer';
import { type SoundName } from '@/hooks/use-audio-engine';
import { useFieldCount } from '@/hooks/use-field-count';
import { useGroups } from '@/hooks/use-groups';
import { useMatch } from '@/hooks/use-match';
import {
    formatTime,
    getAllianceBreakdown,
    getAllianceMembers,
    getAllianceScore,
    getFieldLabel,
    getMatchTitle,
    getPhaseLabel,
} from '@/lib/match-utils';
import EliminationBracketDisplay from '@/pages/elimination/bracket';
import { type AudienceDisplayState, type CompetitionMatch, type SharedData, type TeamDisplay } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';
import { type ReactNode } from 'react';

export function BlankScreen() {
    const { event, name } = usePage<SharedData>().props;
    const game = useGameLook();

    return (
        <Stage className="flex items-center justify-center">
            <Head title={event?.name ?? 'Audience Display'} />
            <div className="flex flex-col border-black bg-black" style={{ width: vw(800), gap: vh(6), padding: vh(6), borderRadius: vh(24) }}>
                <div
                    className="flex items-center justify-center overflow-hidden text-black"
                    style={{ height: vh(300), backgroundColor: DISPLAY_COLORS.tan, borderRadius: `${vh(18)} ${vh(18)} 0 0` }}
                >
                    {game?.logo_url ? (
                        <GameLogo className="max-h-[80%] max-w-[86%]" />
                    ) : (
                        <span className="px-[2vw] text-center leading-none font-black uppercase" style={{ fontSize: vh(90) }}>
                            {game?.name ?? name}
                        </span>
                    )}
                </div>
                <div
                    className="flex items-center justify-center px-[2vw] text-center leading-tight text-black"
                    style={{ minHeight: vh(110), fontSize: vh(40), backgroundColor: '#f0eaa0', borderRadius: `0 0 ${vh(18)} ${vh(18)}` }}
                >
                    {event?.name}
                </div>
            </div>
        </Stage>
    );
}

export function MessageScreen({ message }: { message: string }) {
    return (
        <Stage>
            <Head title="Message" />
            <div className="absolute inset-x-0 top-0 flex items-center justify-center" style={{ bottom: vh(130), padding: `0 ${vw(120)}` }}>
                <p
                    className="bg-white text-center leading-tight break-words whitespace-pre-line text-black"
                    style={{ fontSize: vh(60), padding: `${vh(50)} ${vw(60)}` }}
                >
                    {message}
                </p>
            </div>
            <EventBar />
        </Stage>
    );
}

function useTeamRanks(): Map<number, number | string> {
    const { value: teams = [] } = useProp<TeamDisplay[]>('rankings');

    return new Map(teams.map((team, index) => [team.team_id, team.played > 0 ? index + 1 : 'NP']));
}

function usePreviewTitle(match: CompetitionMatch): string {
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const title = getMatchTitle(match);
    const total = matches.filter((other) => other.type === match.type).length;

    return match.type === 'elimination' || total === 0 ? title : `${title} of ${total}`;
}

export function PreviewScreen({ match }: { match: CompetitionMatch }) {
    const ranks = useTeamRanks();
    const title = usePreviewTitle(match);
    const half = (color: 'red' | 'blue') => (
        <div
            className="flex flex-1 flex-col items-center justify-center"
            style={{ gap: vh(14), backgroundColor: color === 'red' ? DISPLAY_COLORS.redDark : DISPLAY_COLORS.blueDark }}
        >
            {getAllianceMembers(match, color).map((member) => (
                <TeamCard key={member.id} member={member} color={color} rank={ranks.get(member.team.id) ?? 'NP'} />
            ))}
        </div>
    );

    return (
        <Stage>
            <Head title={`${getMatchTitle(match)} · Preview`} />
            <TopBar left="Up Next" title={title} />
            <div className="absolute inset-x-0 flex" style={{ top: vh(76), bottom: vh(76) }}>
                {half('red')}
                {half('blue')}
                <div
                    className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white leading-none text-black"
                    style={{ width: vw(100), height: vh(80), fontSize: vh(56) }}
                >
                    VS
                </div>
            </div>
            <EventBar wide />
        </Stage>
    );
}

export function matchClock(timer: ReturnType<typeof useActiveMatchTimer>['timer'], teleopSeconds: number, match?: CompetitionMatch | null): string {
    if (match?.status === 'upcoming') {
        return formatTime(teleopSeconds + 30);
    }

    return timer.phase === 'transition'
        ? String(timer.phaseRemainingSeconds)
        : timer.phase === 'autonomous'
          ? formatTime(timer.phaseRemainingSeconds + teleopSeconds)
          : formatTime(timer.phase === 'pre-match' ? teleopSeconds + 30 : timer.phaseRemainingSeconds);
}

export function allianceSummary(match: CompetitionMatch | null | undefined, color: 'red' | 'blue'): { teams: string[]; score: number } {
    return {
        teams: match ? getAllianceMembers(match, color).map((member) => member.team.number) : [],
        score: match ? getAllianceScore(match, color) : 0,
    };
}

export function ChromaStage({ color, children }: { color: string; children?: ReactNode }) {
    return (
        <div className="relative h-screen w-screen overflow-hidden font-bold text-white" style={{ backgroundColor: color }}>
            {children}
        </div>
    );
}

export function MatchScreen({
    match,
    timer,
    teleopSeconds,
    flipped = false,
    waitingLabel = 'Waiting for match',
    fieldLabel = null,
}: {
    match: CompetitionMatch | null | undefined;
    timer: ReturnType<typeof useActiveMatchTimer>['timer'];
    teleopSeconds: number;
    flipped?: boolean;
    waitingLabel?: string;
    fieldLabel?: string | null;
}) {
    const clock = matchClock(timer, teleopSeconds, match);
    const alliance = (color: 'red' | 'blue') => allianceSummary(match, color);

    return (
        <Stage>
            <Head title={match ? getMatchTitle(match) : 'Match'} />
            <div className="absolute inset-x-0 top-0 flex items-center justify-center leading-none" style={{ height: vh(74), fontSize: vh(30) }}>
                {fieldLabel ?? (match ? '' : waitingLabel)}
            </div>
            <div
                className="absolute flex flex-col items-center justify-center bg-white text-black"
                style={{ left: vw(306), right: vw(306), top: vh(74), height: vh(432) }}
            >
                <span className="leading-none font-bold tabular-nums" style={{ fontSize: vh(272) }}>
                    {clock}
                </span>
                {timer.phase !== 'pre-match' && timer.phase !== 'post-match' && (
                    <span className="leading-none uppercase" style={{ fontSize: vh(34), marginTop: vh(6) }}>
                        {getPhaseLabel(timer.phase)}
                    </span>
                )}
            </div>
            <ScoreBar title={match ? getMatchTitle(match) : waitingLabel} red={alliance('red')} blue={alliance('blue')} flipped={flipped} />
        </Stage>
    );
}

function ResultsScreen({ match }: { match: CompetitionMatch }) {
    const { data: groups = [] } = useGroups();
    const ranks = useTeamRanks();
    const red = getAllianceBreakdown(match, 'red', groups);
    const blue = getAllianceBreakdown(match, 'blue', groups);
    const labels = [...new Set([...red, ...blue].map((line) => line.label))];
    const points = (lines: typeof red, label: string) => lines.find((line) => line.label === label)?.points ?? 0;
    const teams = (color: 'red' | 'blue') => (
        <div className="flex flex-1 flex-col items-center justify-center" style={{ gap: vh(10) }}>
            {getAllianceMembers(match, color).map((member) => (
                <div key={member.id} className="flex" style={{ height: vh(50), width: vw(330), boxShadow: `0 0 0 ${vh(3)} rgba(0,0,0,0.25)` }}>
                    <div
                        className="flex flex-1 items-center"
                        style={{ backgroundColor: DISPLAY_COLORS[color], paddingLeft: vw(16), fontSize: vh(30) }}
                    >
                        {member.team.number}
                    </div>
                    <div className="flex items-center justify-center bg-black" style={{ width: vw(60), fontSize: vh(26) }}>
                        {ranks.get(member.team.id) ?? '-'}
                    </div>
                </div>
            ))}
        </div>
    );
    const total = (color: 'red' | 'blue') => (
        <div className="flex flex-1 flex-col items-center justify-center leading-none" style={{ backgroundColor: DISPLAY_COLORS[color] }}>
            <span style={{ fontSize: vh(26), marginBottom: vh(8) }}>{color === 'red' ? 'Red' : 'Blue'}</span>
            <span className="tabular-nums" style={{ fontSize: vh(76) }}>
                {getAllianceScore(match, color)}
            </span>
        </div>
    );

    return (
        <Stage>
            <Head title={`${getMatchTitle(match)} · Results`} />
            <TopBar title={getMatchTitle(match)} height={50} />
            <div className="absolute inset-x-0 flex" style={{ top: vh(50), bottom: vh(76) }}>
                <div className="flex flex-1" style={{ backgroundColor: DISPLAY_COLORS.redDark, borderTop: `${vh(28)} solid ${DISPLAY_COLORS.red}` }}>
                    {teams('red')}
                    <div style={{ width: vw(240) }} />
                </div>
                <div
                    className="flex flex-1"
                    style={{ backgroundColor: DISPLAY_COLORS.blueDark, borderTop: `${vh(28)} solid ${DISPLAY_COLORS.blue}` }}
                >
                    <div style={{ width: vw(240) }} />
                    {teams('blue')}
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-black" style={{ width: vw(480) }}>
                    <div className="flex text-white" style={{ height: vh(160) }}>
                        {total('red')}
                        {total('blue')}
                    </div>
                    {labels.map((label, index) => (
                        <div
                            key={label}
                            className="flex items-center leading-none"
                            style={{ height: vh(43), backgroundColor: index % 2 === 0 ? '#ffffff' : '#d9d9d9' }}
                        >
                            <span className="text-center tabular-nums" style={{ width: vw(100), fontSize: vh(36) }}>
                                {points(red, label)}
                            </span>
                            <span className="flex-1 truncate text-center uppercase" style={{ fontSize: vh(26) }}>
                                {label}
                            </span>
                            <span className="text-center tabular-nums" style={{ width: vw(100), fontSize: vh(36) }}>
                                {points(blue, label)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
            <EventBar wide />
        </Stage>
    );
}

/**
 * The one screen for projectors and TVs. Match control decides what it
 * shows; this page just follows, so a display that reloads or joins late
 * always lands on the right screen.
 */
export function AudienceScreen({ playSound, chromaColor }: { playSound?: (name: SoundName) => void; chromaColor?: string }) {
    const { value: display } = useProp<AudienceDisplayState>('display');
    const { timer, activeMatch, matchConfig } = useActiveMatchTimer({ playSound });
    const mode = display?.mode ?? 'blank';
    const matchId = mode === 'match' ? (activeMatch?.id ?? display?.match_id ?? null) : (display?.match_id ?? null);
    const { data: match } = useMatch(matchId, 10000);

    const fieldCount = useFieldCount();
    const teleopSeconds = matchConfig?.timing.teleop ?? 120;

    if (chromaColor && mode === 'video') {
        return <ChromaStage color={chromaColor} />;
    }

    if (chromaColor && mode === 'preview' && match) {
        return (
            <ChromaStage color={chromaColor}>
                <PreviewBar title={getMatchTitle(match)} red={getAllianceMembers(match, 'red')} blue={getAllianceMembers(match, 'blue')} />
            </ChromaStage>
        );
    }

    if (chromaColor && mode === 'match') {
        return (
            <ChromaStage color={chromaColor}>
                <ScoreBar
                    title={match ? getMatchTitle(match) : 'Waiting for match'}
                    red={allianceSummary(match, 'red')}
                    blue={allianceSummary(match, 'blue')}
                    clock={matchClock(timer, teleopSeconds, match)}
                />
            </ChromaStage>
        );
    }

    switch (mode) {
        case 'preview':
            return match ? <PreviewScreen match={match} /> : <BlankScreen />;
        case 'match':
            return (
                <MatchScreen match={match} timer={timer} teleopSeconds={teleopSeconds} fieldLabel={match ? getFieldLabel(match, fieldCount) : null} />
            );
        case 'results':
            return match ? <ResultsScreen match={match} /> : <BlankScreen />;
        case 'rankings':
            return <RankingsBoard title="Rankings" />;
        case 'bracket':
            return <EliminationBracketDisplay />;
        case 'alliance_selection':
            return <AllianceSelectionScreen />;
        case 'message':
            return display?.message ? <MessageScreen message={display.message} /> : <BlankScreen />;
        case 'award':
            return display?.award ? <AwardScreen award={display.award} /> : <BlankScreen />;
        case 'sponsors':
            return display?.sponsors?.length ? <SponsorsScreen sponsors={display.sponsors} /> : <BlankScreen />;
        case 'slideshow':
            return <SlideshowScreen />;
        case 'wifi':
            return <WifiScreen />;
        case 'key':
            return <KeyScreen />;
        case 'safety':
            return <SafetyScreen />;
        case 'online_results':
            return <OnlineResultsScreen />;
        case 'inspection':
            return <InspectionScreen />;
        default:
            return <BlankScreen />;
    }
}
