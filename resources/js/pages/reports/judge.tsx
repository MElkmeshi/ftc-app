import PrintLayout from '@/layouts/print-layout';
import { getMatchTitle } from '@/lib/match-utils';
import { type CompetitionMatch, type SharedData, type Team } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * A sheet per team with its qualification matches, for judges who watch
 * teams play (FTC Live's judge match observer sheets).
 */
export default function JudgeReport() {
    const { event, teams, matches } = usePage<SharedData & { teams: Team[]; matches: CompetitionMatch[] }>().props;
    const [columnText, setColumnText] = useState('Autonomous, Driving, Teamwork, Notes');
    const columns = columnText
        .split(',')
        .map((column) => column.trim())
        .filter((column) => column !== '');

    return (
        <PrintLayout
            title="Judge observer sheets"
            toolbar={
                <label className="flex items-center gap-2 text-sm">
                    Columns
                    <input
                        className="w-72 rounded border px-2 py-1"
                        value={columnText}
                        onChange={(changeEvent) => setColumnText(changeEvent.target.value)}
                    />
                </label>
            }
        >
            {teams.length === 0 && <p className="text-muted-foreground py-12 text-center">No teams yet.</p>}
            <div className="space-y-8 print:space-y-0">
                {teams.map((team) => {
                    const own = matches.filter((match) => match.match_alliances.some((member) => member.team?.id === team.id));

                    return (
                        <section key={team.id} className="break-after-page">
                            <p className="text-sm text-gray-600">{event?.name} · Match observer sheet</p>
                            <h2 className="mb-3 text-2xl font-bold">
                                <span className="font-mono">{team.number}</span> {team.name}
                            </h2>
                            <table className="w-full table-fixed border-collapse text-sm">
                                <thead>
                                    <tr className="border-b-2 text-left">
                                        <th className="w-36 py-1">Match</th>
                                        {columns.map((column) => (
                                            <th key={column} className="py-1">
                                                {column}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {own.length === 0 ? (
                                        <tr>
                                            <td colSpan={columns.length + 1} className="py-3 text-gray-500">
                                                No qualification matches scheduled.
                                            </td>
                                        </tr>
                                    ) : (
                                        own.map((match) => (
                                            <tr key={match.id} className="h-16 border-b align-top">
                                                <td className="py-2 font-medium">{getMatchTitle(match)}</td>
                                                {columns.map((column) => (
                                                    <td key={column} className="border-l py-2" />
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </section>
                    );
                })}
            </div>
        </PrintLayout>
    );
}
