import PrintLayout from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { type Standing } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * A page per team with its number big enough to read across the venue (FTC
 * Live's Team Placards), in ranking order for alliance selection.
 */
export default function PlacardsReport() {
    const { event, teams, standings } = usePage<SharedData & { teams: Team[]; standings: Record<number, Standing> }>().props;
    const [sortByRank, setSortByRank] = useState(true);
    const sheets = sortByRank ? teams : [...teams].sort((a, b) => Number(a.number) - Number(b.number));

    return (
        <PrintLayout title="Team Placards" plain>
            <div className={cn(bs.alertInfo, 'text-center print:hidden')}>
                This page renders a page per team, which can be printed and placed where you would like teams to line up for alliance selection, used
                for pit signs (without rankings), or for other purposes.
                <br />
                <input type="checkbox" id="showRank" checked={sortByRank} onChange={() => setSortByRank(!sortByRank)} />{' '}
                <label htmlFor="showRank">Sort by rank (uncheck for team number order)</label>
            </div>
            <div>
                {sheets.map((team) => (
                    <section key={team.id} className="flex h-screen w-full break-after-page flex-col items-center pt-[1em] pb-[2em]">
                        <div className="mt-[10px] text-[28px]">{event?.name}</div>
                        <div className="mt-5 text-[150px] font-bold">Team {team.number}</div>
                        <div className="h-[130px] text-center text-[40px]">{team.name}</div>
                        {sortByRank && standings[team.id] && <div className="mt-5 text-[80px] font-bold">Rank #{standings[team.id].rank}</div>}
                    </section>
                ))}
            </div>
        </PrintLayout>
    );
}
