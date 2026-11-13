import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type MatchNote, type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';

type ReportNote = MatchNote & { match?: Pick<CompetitionMatch, 'number' | 'type' | 'round'> | null };

/**
 * A row per team with room to write notes against it (FTC Live's head
 * referee tracking report).
 */
export default function NotesReport() {
    const { event, teams, notes } = usePage<SharedData & { teams: Team[]; notes: ReportNote[] }>().props;

    return (
        <PrintLayout title="Head Referee Tracking Report" plain>
            <div className="h-6 print:hidden" />
            <h4 className={cn(bs.h4, 'text-center')}>Head Referee Tracking Report</h4>
            <h6 className="mb-2 text-center text-base leading-[1.2] font-medium">{event?.name}</h6>
            <ReportRow>
                <table className={cn(bs.table, bs.tableBordered, 'text-[12px] [&_td]:p-[.1rem] [&_th]:p-[.1rem]')}>
                    <thead>
                        <tr>
                            <th className="w-[7ch] text-center">#</th>
                            <th className="w-[25ch] text-center">Short Name</th>
                            <th scope="col" className="text-left">
                                Notes
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map((team) => (
                            <tr key={team.id} className="break-inside-avoid">
                                <td className="text-center">{team.number}</td>
                                <td className="text-left">{team.name}</td>
                                <td className="text-left">
                                    {notes
                                        .filter((note) => note.teams?.includes(String(team.number)))
                                        .map((note) => (
                                            <div key={note.id}>
                                                <b>{note.match ? `${getMatchTitle(note.match)}: ` : ''}</b>
                                                {note.summary}
                                                {note.detail && ` — ${note.detail}`}
                                            </div>
                                        ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ReportRow>
        </PrintLayout>
    );
}
