import { EventBar, Stage, vh, vw } from '@/components/display/display-kit';
import { type Sponsor } from '@/types';
import { Head } from '@inertiajs/react';

function sponsorLevels(sponsors: Sponsor[]): { level: string | null; sponsors: Sponsor[] }[] {
    const levels: { level: string | null; sponsors: Sponsor[] }[] = [];

    for (const sponsor of sponsors) {
        const current = levels.at(-1);

        if (current && current.level === sponsor.level) {
            current.sponsors.push(sponsor);
        } else {
            levels.push({ level: sponsor.level, sponsors: [sponsor] });
        }
    }

    return levels;
}

export function SponsorsScreen({ sponsors }: { sponsors: Sponsor[] }) {
    return (
        <Stage>
            <Head title="Sponsors" />
            <div
                className="absolute inset-x-0 top-0 flex flex-col items-center justify-center overflow-hidden"
                style={{ bottom: vh(130), gap: vh(18), padding: `${vh(20)} ${vw(60)}` }}
            >
                {sponsorLevels(sponsors).map((group, index) => (
                    <section key={index} className="flex w-full flex-col items-center" style={{ gap: vh(8) }}>
                        <h2 className="leading-none" style={{ fontSize: vh(24) }}>
                            {group.level ?? 'Sponsors'}
                        </h2>
                        <div className="flex w-full flex-wrap items-stretch justify-center" style={{ gap: vh(14) }}>
                            {group.sponsors.map((sponsor) => (
                                <div
                                    key={sponsor.id}
                                    className="flex flex-1 items-center justify-center bg-white text-black"
                                    style={{
                                        minWidth: vw(260),
                                        maxWidth: vw(1150),
                                        height: vh(group.sponsors.length === 1 ? 330 : 170),
                                        padding: vh(20),
                                    }}
                                >
                                    {sponsor.logo_url ? (
                                        <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <span className="text-center leading-tight" style={{ fontSize: vh(56) }}>
                                            {sponsor.name}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
            <EventBar />
        </Stage>
    );
}
