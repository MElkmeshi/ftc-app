import PrintLayout from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';

const COLUMNS = ['Autonomous Mode', 'Game Play', 'Reliability', 'Standout Notes'];

const CELL = 'w-1/5 border border-black';

/**
 * A sheet per team with its qualification matches, for judges who watch
 * teams play (FTC Live's judge match observer sheets).
 */
export default function JudgeReport() {
    const { teams, matches } = usePage<SharedData & { teams: Team[]; matches: CompetitionMatch[] }>().props;

    return (
        <PrintLayout title="Judge Match Observer Sheets" plain>
            <div className={cn(bs.alertInfo, 'text-center print:hidden')}>
                This page renders a Match Observer Sheet for each team with their matches prefilled and is designed to be printed.
            </div>
            {teams.map((team) => {
                const own = matches.filter((match) => match.match_alliances.some((member) => member.team?.id === team.id));

                return (
                    <section key={team.id} className="flex h-screen w-full break-after-page flex-col pt-[1em] pb-[2em]">
                        <h2 className={cn(bs.h2, 'border-b-[5px] border-[#f57e25]')}>Appendix H: Judge Match Observer Sheet</h2>
                        <div className="text-2xl leading-normal">
                            Team: {team.number} {team.name}
                        </div>
                        <table className="w-full grow table-fixed border-collapse border border-black">
                            <tbody>
                                <tr>
                                    <th className={cn(CELL, 'h-[3ch] bg-[#f57e25] text-left font-bold [print-color-adjust:exact]')}>Match #</th>
                                    {COLUMNS.map((column) => (
                                        <th key={column} className={cn(CELL, 'h-[3ch] bg-[#f57e25] text-left font-bold [print-color-adjust:exact]')}>
                                            {column}
                                        </th>
                                    ))}
                                </tr>
                                {own.map((match) => (
                                    <tr key={match.id}>
                                        <td className={cn(CELL, 'text-center text-4xl leading-normal')}>{match.number}</td>
                                        {COLUMNS.map((column) => (
                                            <td key={column} className={CELL} />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                );
            })}
        </PrintLayout>
    );
}
