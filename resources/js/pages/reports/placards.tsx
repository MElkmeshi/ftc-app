import PrintLayout from '@/layouts/print-layout';
import { type Standing } from '@/lib/report-utils';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';

/**
 * A page per team with its number big enough to read across the venue (FTC
 * Live's Team Placards), in ranking order for alliance selection.
 */
export default function PlacardsReport() {
    const { event, teams, standings } = usePage<SharedData & { teams: Team[]; standings: Record<number, Standing> }>().props;

    return (
        <PrintLayout title="Team placards">
            <p className="text-muted-foreground mb-4 text-sm print:hidden">
                One landscape page per team, in ranking order (unranked teams last, by number). Set the printer to landscape.
            </p>
            <div className="space-y-6 print:space-y-0">
                {teams.map((team) => (
                    <section
                        key={team.id}
                        className="flex aspect-[11/8.5] break-after-page flex-col items-center justify-center rounded border p-8 text-center print:aspect-auto print:h-screen print:rounded-none print:border-0"
                    >
                        {standings[team.id] && <div className="text-2xl text-gray-600">Rank {standings[team.id].rank}</div>}
                        <div className="font-mono text-[9rem] leading-none font-black tabular-nums print:text-[14rem]">{team.number}</div>
                        <div className="mt-4 text-4xl font-semibold">{team.name}</div>
                        {(team.organization || team.city) && (
                            <div className="mt-2 text-xl text-gray-600">{[team.organization, team.city].filter(Boolean).join(' · ')}</div>
                        )}
                        <div className="mt-8 text-sm text-gray-400">{event?.name}</div>
                    </section>
                ))}
            </div>
        </PrintLayout>
    );
}
