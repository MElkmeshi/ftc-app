import { GameBackground, GameLogo, useGameLook } from '@/components/game-look';
import { cn } from '@/lib/utils';
import { type MatchAlliance, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { type CSSProperties, type ReactNode } from 'react';

export const DISPLAY_COLORS = {
    background: '#0a3f52',
    red: '#ed1c24',
    redDark: '#7f0d14',
    blue: '#0066b3',
    blueDark: '#0b3e73',
    tan: '#efe3c4',
    tanDark: '#b9b48a',
    olive: '#a3a56c',
};

export const vh = (pixels: number): string => `${(pixels / 7.2).toFixed(3)}vh`;

export const vw = (pixels: number): string => `${(pixels / 12.8).toFixed(3)}vw`;

export function Stage({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
    return (
        <div
            className={cn('relative isolate h-screen w-screen overflow-hidden font-bold text-white', className)}
            style={{ backgroundColor: DISPLAY_COLORS.background, ...style }}
        >
            <GameBackground />
            {children}
        </div>
    );
}

function LogoBox({ className, style }: { className?: string; style?: CSSProperties }) {
    const { name } = usePage<SharedData>().props;
    const game = useGameLook();

    return (
        <div className={cn('flex shrink-0 items-center justify-center overflow-hidden', className)} style={style}>
            {game?.logo_url ? (
                <GameLogo className="max-h-[80%] max-w-[86%]" />
            ) : (
                <span className="truncate px-[1vw] leading-none font-black tracking-tight uppercase" style={{ fontSize: vh(22) }}>
                    {game?.name ?? name}
                </span>
            )}
        </div>
    );
}

export function TopBar({ left, title, height = 76 }: { left?: ReactNode; title: ReactNode; height?: number }) {
    return (
        <div className="absolute inset-x-0 top-0 flex items-center bg-black" style={{ height: vh(height), fontSize: vh(height > 60 ? 30 : 26) }}>
            <div className="flex h-full items-center" style={{ width: vw(376), paddingLeft: vw(20) }}>
                {left}
            </div>
            <div className="flex-1 truncate text-center">{title}</div>
            <div className="flex h-full justify-end" style={{ width: vw(376) }}>
                <LogoBox className="h-full bg-white text-black" style={{ width: vw(188) }} />
            </div>
        </div>
    );
}

export function EventBar({ wide = false }: { wide?: boolean }) {
    const { event, name } = usePage<SharedData>().props;

    if (wide) {
        return (
            <div className="absolute inset-x-0 bottom-0 flex bg-white text-black" style={{ height: vh(76) }}>
                <div
                    className="flex h-full shrink-0 items-center justify-center bg-black px-[1vw] text-center leading-none font-black text-white uppercase"
                    style={{ width: vw(226), fontSize: vh(20) }}
                >
                    {name}
                </div>
                <div className="flex items-center truncate" style={{ paddingLeft: vw(14), fontSize: vh(28) }}>
                    {event?.name}
                </div>
            </div>
        );
    }

    return (
        <div className="absolute flex bg-white text-black" style={{ left: vw(124), right: vw(124), bottom: vh(8), height: vh(114) }}>
            <LogoBox className="h-full bg-white text-black" style={{ width: vw(190) }} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-1 items-center truncate" style={{ paddingLeft: vw(10), fontSize: vh(28) }}>
                    {event?.name}
                </div>
                <div style={{ height: vh(34), backgroundColor: DISPLAY_COLORS.olive }} />
            </div>
        </div>
    );
}

export function TeamCard({ member, color, rank }: { member: MatchAlliance; color: 'red' | 'blue'; rank?: number | string | null }) {
    return (
        <div style={{ width: vw(522) }}>
            <div className="flex" style={{ height: vh(50) }}>
                <div
                    className="flex flex-1 items-center text-white"
                    style={{ backgroundColor: DISPLAY_COLORS[color], paddingLeft: vw(16), fontSize: vh(30) }}
                >
                    {member.team.number}
                </div>
                <div className="flex items-center justify-center bg-black text-white" style={{ width: vw(50), fontSize: vh(22) }}>
                    {rank ?? ''}
                </div>
            </div>
            <div className="flex items-center truncate bg-white text-black" style={{ height: vh(50), paddingLeft: vw(8), fontSize: vh(30) }}>
                {member.team.name}
            </div>
        </div>
    );
}

export function ScoreBar({
    title,
    red,
    blue,
    flipped = false,
    clock,
}: {
    title: ReactNode;
    red: { teams: string[]; score: number };
    blue: { teams: string[]; score: number };
    flipped?: boolean;
    clock?: string;
}) {
    const { event } = usePage<SharedData>().props;

    const side = (color: 'red' | 'blue', alliance: { teams: string[]; score: number }, scoreFirst: boolean) => (
        <div
            className={cn('flex flex-1 items-stretch', scoreFirst ? 'flex-row-reverse' : 'flex-row')}
            style={{ backgroundColor: color === 'red' ? DISPLAY_COLORS.redDark : DISPLAY_COLORS.blueDark }}
        >
            <div className="flex-1" />
            <div className="flex flex-col justify-center" style={{ gap: vh(4), width: vw(124), padding: `0 ${vw(6)}` }}>
                {alliance.teams.map((team) => (
                    <div key={team} className="flex items-center justify-center bg-white text-black" style={{ height: vh(50), fontSize: vh(26) }}>
                        {team}
                    </div>
                ))}
            </div>
            <div
                className="flex flex-col items-center justify-center leading-none"
                style={{ width: vw(150), backgroundColor: DISPLAY_COLORS[color] }}
            >
                <span style={{ fontSize: vh(17), marginBottom: vh(8) }}>{color === 'red' ? 'Red' : 'Blue'}</span>
                <span className="tabular-nums" style={{ fontSize: vh(62) }}>
                    {alliance.score}
                </span>
            </div>
        </div>
    );

    const timer = clock !== undefined && (
        <div className="flex shrink-0 items-center justify-center bg-white text-black tabular-nums" style={{ width: vw(150), fontSize: vh(58) }}>
            {clock}
        </div>
    );

    return (
        <div className="absolute inset-x-0 bottom-0">
            <div className="flex items-center bg-black" style={{ height: vh(50), fontSize: vh(22) }}>
                <div className="flex-1 truncate text-center">{event?.name}</div>
                <div className="flex-1 truncate text-center">{title}</div>
                <LogoBox className="h-full bg-white text-black" style={{ width: vw(220) }} />
            </div>
            <div className="flex" style={{ height: vh(120) }}>
                {flipped ? (
                    <>
                        {side('blue', blue, false)}
                        {timer}
                        {side('red', red, true)}
                    </>
                ) : (
                    <>
                        {side('red', red, false)}
                        {timer}
                        {side('blue', blue, true)}
                    </>
                )}
            </div>
        </div>
    );
}

export function PreviewBar({ title, red, blue }: { title: ReactNode; red: MatchAlliance[]; blue: MatchAlliance[] }) {
    const { event } = usePage<SharedData>().props;

    const side = (color: 'red' | 'blue', members: MatchAlliance[]) => (
        <div
            className="flex flex-1 flex-col justify-center"
            style={{ gap: vh(4), padding: `${vh(6)} ${vw(10)}`, backgroundColor: color === 'red' ? DISPLAY_COLORS.redDark : DISPLAY_COLORS.blueDark }}
        >
            {members.map((member) => (
                <div key={member.id} className="flex" style={{ height: vh(44), fontSize: vh(24) }}>
                    <div className="flex items-center justify-center text-white" style={{ width: vw(110), backgroundColor: DISPLAY_COLORS[color] }}>
                        {member.team.number}
                    </div>
                    <div className="flex flex-1 items-center truncate bg-white text-black" style={{ paddingLeft: vw(8) }}>
                        {member.team.name}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="absolute inset-x-0 bottom-0">
            <div className="flex items-center bg-black" style={{ height: vh(50), fontSize: vh(22) }}>
                <div className="flex-1 truncate text-center">{event?.name}</div>
                <div className="flex-1 truncate text-center">{title}</div>
                <LogoBox className="h-full bg-white text-black" style={{ width: vw(220) }} />
            </div>
            <div className="flex">
                {side('red', red)}
                {side('blue', blue)}
            </div>
        </div>
    );
}
