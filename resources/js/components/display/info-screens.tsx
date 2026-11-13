import { DISPLAY_COLORS, EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { SponsorsScreen } from '@/components/display/sponsors-screen';
import { useGroups } from '@/hooks/use-groups';
import { useScoreTypes } from '@/hooks/use-match';
import { type InspectionStatus, type TeamInspectionStatus } from '@/lib/inspection-utils';
import { type ScoreType, type SharedData, type Sponsor } from '@/types';
import { Head, router, usePage, useProp } from '@inertiajs/react';
import { type ReactNode, useEffect, useState } from 'react';

const SLIDE_SECONDS = 10;
const INSPECTION_REFRESH_SECONDS = 15;

const INSPECTION_COLORS: Record<InspectionStatus, { label: string; color: string }> = {
    not_started: { label: 'Not Started', color: '#000000' },
    in_progress: { label: 'In Progress', color: '#00ffff' },
    incomplete: { label: 'Incomplete', color: '#f0e442' },
    passed: { label: 'Passed', color: '#32cd32' },
};

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Stage>
            <Head title={title} />
            <div
                className="absolute flex flex-col items-center justify-center bg-white text-center text-black"
                style={{ left: vw(160), right: vw(160), top: vh(40), bottom: vh(150), padding: `${vh(30)} ${vw(50)}`, gap: vh(22) }}
            >
                {children}
            </div>
            <EventBar />
        </Stage>
    );
}

export function WifiScreen() {
    return (
        <InfoCard title="Wi-Fi Reminder">
            <p className="leading-tight" style={{ fontSize: vh(54) }}>
                Please <span className="text-[#e8501a]">TURN OFF Wi-Fi</span> on Phones, Tablets, and Hot Spots
            </p>
            <p className="leading-tight italic" style={{ fontSize: vh(44) }}>
                Leave the Wi-Fi to the Robots!
            </p>
        </InfoCard>
    );
}

export function SafetyScreen() {
    const section = (heading: string, lines: string[]) => (
        <div className="w-full text-left">
            <h2 className="leading-tight" style={{ fontSize: vh(32) }}>
                {heading}
            </h2>
            <ul className="list-disc font-normal" style={{ fontSize: vh(24), paddingLeft: vw(36) }}>
                {lines.map((line) => (
                    <li key={line}>{line}</li>
                ))}
            </ul>
        </div>
    );

    return (
        <InfoCard title="Safety & Security">
            <h1 className="leading-none" style={{ fontSize: vh(44) }}>
                Issue Reporting
            </h1>
            {section('Medical Incidents', [
                'Report the issue to Pit Admin and call the local emergency services number if there is any question of the severity of the injury',
                'Ensure the person has access to first aid support',
            ])}
            {section('Safety Concerns', [
                'You have the right to feel safe and respected at this event',
                'Report concerns such as suspected abuse, bullying or harassment to Pit Admin or the Event Director',
            ])}
        </InfoCard>
    );
}

export function OnlineResultsScreen() {
    const { event } = usePage<SharedData>().props;

    return (
        <InfoCard title="Online Results">
            <h1 className="leading-none" style={{ fontSize: vh(48) }}>
                Follow this event online
            </h1>
            <p className="font-normal" style={{ fontSize: vh(30) }}>
                Schedule, rankings and match results:
            </p>
            <p className="break-all" style={{ fontSize: vh(46) }}>
                {window.location.host}/event/{event?.code}
            </p>
        </InfoCard>
    );
}

function keyPoints(scoreType: ScoreType): string {
    return scoreType.awarded_to === 'opponent' ? `+${scoreType.points} to opponent` : String(scoreType.points);
}

export function KeyScreen() {
    const { data: scoreTypes = [] } = useScoreTypes();
    const { data: groups = [] } = useGroups();
    const ordered = [...groups].sort((a, b) => a.display_order - b.display_order);
    const columns = [
        ...ordered.map((group) => ({ title: group.name, items: scoreTypes.filter((scoreType) => scoreType.group_id === group.id) })),
        {
            title: ordered.length > 0 ? 'Other' : 'Scoring',
            items: scoreTypes.filter((scoreType) => !ordered.some((group) => group.id === scoreType.group_id)),
        },
    ].filter((column) => column.items.length > 0);

    return (
        <Stage>
            <Head title="Audience Key" />
            <div className="absolute inset-x-0 top-0 flex" style={{ bottom: vh(130) }}>
                {columns.map((column, index) => (
                    <div
                        key={column.title}
                        className="flex min-w-0 flex-1 flex-col"
                        style={{
                            backgroundColor: index % 2 === 0 ? DISPLAY_COLORS.redDark : DISPLAY_COLORS.blueDark,
                            padding: `${vh(16)} ${vw(18)}`,
                            gap: vh(10),
                        }}
                    >
                        <h2 className="text-center leading-none" style={{ fontSize: vh(30), marginBottom: vh(8) }}>
                            {column.title} Key
                        </h2>
                        {column.items.map((scoreType) => (
                            <div key={scoreType.id} className="flex items-center justify-between" style={{ gap: vw(10), fontSize: vh(24) }}>
                                <span className="flex min-w-0 items-center font-normal" style={{ gap: vw(8) }}>
                                    {scoreType.icon_url && <img src={scoreType.icon_url} alt="" style={{ height: vh(30) }} />}
                                    <span className="truncate">{scoreType.name}</span>
                                </span>
                                <span className="shrink-0 bg-white px-[0.6vw] text-black tabular-nums">{keyPoints(scoreType)}</span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <EventBar />
        </Stage>
    );
}

export function InspectionScreen() {
    const { value: teams = [] } = useProp<TeamInspectionStatus[]>('inspection');

    useEffect(() => {
        const refresh = () => router.reload({ only: ['inspection'] });
        refresh();
        const id = setInterval(refresh, INSPECTION_REFRESH_SECONDS * 1000);

        return () => clearInterval(id);
    }, []);

    return (
        <Stage>
            <Head title="Inspection Status" />
            <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ bottom: vh(130), padding: `${vh(8)} ${vw(8)}` }}>
                <table className="w-full border-collapse bg-black text-left font-normal" style={{ fontSize: vh(18) }}>
                    <thead>
                        <tr>
                            <th className="border border-white text-center" style={{ width: vw(90) }}>
                                Robot
                            </th>
                            <th className="border border-white px-[0.5vw]" style={{ width: vw(110) }}>
                                Team
                            </th>
                            <th className="border border-white text-center">Name</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.id}>
                                <td
                                    className="border border-white"
                                    aria-label={INSPECTION_COLORS[team.status]?.label}
                                    style={{ backgroundColor: INSPECTION_COLORS[team.status]?.color }}
                                />
                                <td className="border border-white px-[0.5vw] font-bold">{team.number}</td>
                                <td className="border border-white px-[0.5vw]">{team.name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="mx-auto flex w-fit bg-black font-bold" style={{ marginTop: vh(14), fontSize: vh(18) }}>
                    <span className="border border-white px-[0.6vw]">Status</span>
                    {Object.values(INSPECTION_COLORS).map((entry) => (
                        <span
                            key={entry.label}
                            className="border border-white px-[0.6vw]"
                            style={{ backgroundColor: entry.color, color: entry.color === '#000000' ? '#ffffff' : '#000000' }}
                        >
                            {entry.label}
                        </span>
                    ))}
                </div>
            </div>
            <EventBar />
        </Stage>
    );
}

export function SlideshowScreen() {
    const { value: sponsors = [] } = useProp<Sponsor[]>('sponsors');
    const slides = [
        <WifiScreen key="wifi" />,
        ...(sponsors.length > 0 ? [<SponsorsScreen key="sponsors" sponsors={sponsors} />] : []),
        <SafetyScreen key="safety" />,
        <OnlineResultsScreen key="online" />,
    ];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setIndex((current) => current + 1), SLIDE_SECONDS * 1000);

        return () => clearInterval(id);
    }, []);

    return slides[index % slides.length];
}
