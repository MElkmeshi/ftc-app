import { GameBackground } from '@/components/game-look';
import { type SharedData, type Sponsor } from '@/types';
import { Head, usePage } from '@inertiajs/react';

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
    const { event } = usePage<SharedData>().props;

    return (
        <div className="relative isolate flex h-screen w-screen flex-col items-center justify-center gap-[4vh] overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 px-16 py-[4vh] text-white">
            <Head title="Sponsors" />
            <GameBackground />
            <p className="text-[min(1.5rem,3vh)] tracking-[0.3em] text-white/50 uppercase">{event?.name}</p>
            <h1 className="text-[min(4rem,9vh)] font-black tracking-tight">Thank You to Our Sponsors</h1>
            {sponsorLevels(sponsors).map((group, index) => (
                <section key={index} className="flex flex-col items-center gap-[2vh]">
                    {group.level && (
                        <h2 className="text-[min(1.875rem,4vh)] font-semibold tracking-widest text-yellow-400 uppercase">{group.level}</h2>
                    )}
                    <div className="flex flex-wrap items-center justify-center gap-x-[4vw] gap-y-[3vh]">
                        {group.sponsors.map((sponsor) =>
                            sponsor.logo_url ? (
                                <div key={sponsor.id} className="flex h-[min(9rem,16vh)] items-center rounded-xl bg-white px-6 py-3">
                                    <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-full max-w-[22vw] object-contain" />
                                </div>
                            ) : (
                                <div key={sponsor.id} className="text-[min(3rem,7vh)] font-bold">
                                    {sponsor.name}
                                </div>
                            ),
                        )}
                    </div>
                </section>
            ))}
        </div>
    );
}
