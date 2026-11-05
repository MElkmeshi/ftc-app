import PrintLayout from '@/layouts/print-layout';
import { getAllianceColorClasses, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * Every match with its teams and room to write, for the field technical
 * staff to note robot and field problems (FTC Live's FTA notes).
 */
export default function FieldNotesReport() {
    const { event, matches } = usePage<SharedData & { matches: CompetitionMatch[] }>().props;
    const [type, setType] = useState<CompetitionMatch['type'] | 'all'>('qualification');
    const visible = type === 'all' ? matches : matches.filter((match) => match.type === type);

    return (
        <PrintLayout
            title="Field notes"
            toolbar={
                <select
                    className="rounded border px-2 py-1 text-sm"
                    value={type}
                    onChange={(changeEvent) => setType(changeEvent.target.value as CompetitionMatch['type'] | 'all')}
                >
                    <option value="practice">Practice</option>
                    <option value="qualification">Qualification</option>
                    <option value="elimination">Playoffs</option>
                    <option value="all">Every match</option>
                </select>
            }
        >
            <p className="text-sm text-gray-600">{event?.name}</p>
            <h2 className="mb-3 text-2xl font-bold">Field notes</h2>
            {visible.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No matches to print.</p>
            ) : (
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 text-left">
                            <th className="w-40 py-1">Match</th>
                            <th className="w-40 py-1">Teams</th>
                            <th className="py-1">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visible.map((match) => (
                            <tr key={match.id} className="h-14 break-inside-avoid border-b align-top">
                                <td className="py-2 font-medium">{getMatchTitle(match)}</td>
                                <td className="py-2 font-mono">
                                    {allianceColorsOf(match).map((color) => (
                                        <div key={color} className={cn(getAllianceColorClasses(color).text)}>
                                            {membersOf(match, color)
                                                .map((member) => member.team?.number)
                                                .join(' · ')}
                                        </div>
                                    ))}
                                </td>
                                <td className="border-l py-2" />
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </PrintLayout>
    );
}
