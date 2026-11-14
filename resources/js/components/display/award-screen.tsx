import { DISPLAY_COLORS, EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { GameLogo, useGameLook } from '@/components/game-look';
import { type AwardRecipient, type PresentedAward, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

const PLACE_LABELS = ['Winner', '2nd Place', '3rd Place', 'Runner Up'];
const SPONSOR_SEPARATOR = ' sponsored by ';

function recipientLabel(winner: AwardRecipient): string {
    if (winner.recipient) {
        return winner.team_number ? `${winner.recipient} (${winner.team_number})` : winner.recipient;
    }

    return winner.team_number ?? '';
}

function WinnerBar({ winner, showsTeamBox }: { winner: AwardRecipient; showsTeamBox: boolean }) {
    const hasLogo = Boolean(useGameLook()?.logo_url);

    return (
        <div
            className="flex items-center text-left text-black"
            style={{ height: vh(100), marginTop: vh(6.7), fontSize: vh(36), backgroundColor: DISPLAY_COLORS.olive }}
        >
            {showsTeamBox && winner.team_number && hasLogo && (
                <div className="flex h-full shrink-0 items-center justify-center bg-white" style={{ width: vw(123), marginRight: vw(13) }}>
                    <GameLogo className="max-h-[60%] max-w-[70%]" />
                </div>
            )}
            <div className="min-w-0 flex-1" style={{ padding: `0 ${vw(13)}` }}>
                <div className="flex items-center">
                    <span className="shrink-0">{recipientLabel(winner)}</span>
                    {winner.team_name && (
                        <span className="min-w-0 flex-1 truncate" style={{ marginLeft: vw(27) }}>
                            {winner.team_name}
                        </span>
                    )}
                </div>
                {winner.team_location && (
                    <div className="truncate text-right font-normal" style={{ fontSize: vh(28) }}>
                        {winner.team_location}
                    </div>
                )}
            </div>
        </div>
    );
}

function AwardBars({ award }: { award: PresentedAward }) {
    const { name: appName } = usePage<SharedData>().props;
    const latest = award.revealed.at(-1);
    const shown = award.kind ? award.revealed : award.revealed.slice(-1);
    const [title, sponsor] = award.name.split(SPONSOR_SEPARATOR);

    return (
        <>
            <div className="flex items-center bg-white text-black" style={{ height: vh(74.7), fontSize: vh(28) }}>
                <div
                    className="flex h-full shrink-0 items-center justify-center bg-black px-[1vw] text-center leading-none font-black text-white uppercase"
                    style={{ width: vw(217), marginRight: vw(13), fontSize: vh(20) }}
                >
                    {appName}
                </div>
                <span className="truncate">{title}</span>
                {latest && !award.kind && <span className="shrink-0">&nbsp;{PLACE_LABELS[Math.min(latest.place, PLACE_LABELS.length) - 1]}</span>}
                {sponsor && (
                    <span className="shrink-0" style={{ fontSize: vh(24) }}>
                        &nbsp;sponsored by {sponsor}
                    </span>
                )}
            </div>
            {shown.flatMap((slot) =>
                slot.winners.map((winner, index) => <WinnerBar key={`${slot.place}-${index}`} winner={winner} showsTeamBox={award.is_team_award} />),
            )}
        </>
    );
}

/**
 * An award on the audience display, laid out like FTC Live's: a white title
 * bar with the award's name and the place being announced, and under it a
 * bar for each winner of that place. An alliance's award keeps the teams
 * already announced on screen, captain first. On a stream overlay the bars sit at the
 * bottom of the keyed picture instead.
 */
export function AwardScreen({ award, chromaColor }: { award: PresentedAward; chromaColor?: string }) {
    if (chromaColor) {
        return (
            <div className="relative h-screen w-screen overflow-hidden font-bold" style={{ backgroundColor: chromaColor }}>
                <Head title={award.name} />
                <div className="absolute" style={{ left: vw(124), right: vw(124), bottom: vh(18) }}>
                    <AwardBars award={award} />
                </div>
            </div>
        );
    }

    return (
        <Stage>
            <Head title={award.name} />
            <div className="absolute" style={{ left: vw(124), right: vw(124), top: vh(40) }}>
                <AwardBars award={award} />
            </div>
            <EventBar />
        </Stage>
    );
}
