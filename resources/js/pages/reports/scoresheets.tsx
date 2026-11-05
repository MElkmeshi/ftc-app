import PrintLayout from '@/layouts/print-layout';
import { formatMatchTime, getAllianceColorClasses, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type Group, type ScoreType, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

type SheetScoreType = Pick<ScoreType, 'id' | 'name' | 'points' | 'group_id' | 'target' | 'kind' | 'choice_set' | 'referee' | 'awarded_to'>;

interface SheetSection {
    title: string;
    scoreTypes: SheetScoreType[];
}

function sectionsFor(groups: Group[], scoreTypes: SheetScoreType[]): SheetSection[] {
    const scoring = scoreTypes.filter((scoreType) => scoreType.referee !== 'penalty');
    const sections = groups.map((group) => ({ title: group.name, scoreTypes: scoring.filter((scoreType) => scoreType.group_id === group.id) }));

    sections.push({ title: 'Other', scoreTypes: scoring.filter((scoreType) => scoreType.group_id === null) });
    sections.push({ title: 'Penalties', scoreTypes: scoreTypes.filter((scoreType) => scoreType.referee === 'penalty') });

    return sections.filter((section) => section.scoreTypes.length > 0);
}

function EntryBox({ kind }: { kind: SheetScoreType['kind'] }) {
    if (kind === 'count') {
        return <span className="inline-block h-6 w-16 border border-gray-500" />;
    }

    return <span className={cn('inline-block size-5 border border-gray-500', kind === 'choice' && 'rounded-full')} />;
}

function describePoints(scoreType: SheetScoreType): string {
    const points = `${scoreType.points > 0 ? '+' : ''}${scoreType.points}`;

    return scoreType.awarded_to === 'opponent' ? `${points} to opponent` : points;
}

function AllianceSheet({ match, color, sections }: { match: CompetitionMatch; color: string; sections: SheetSection[] }) {
    const { event } = usePage<SharedData>().props;
    const teams = membersOf(match, color);

    return (
        <section className="break-after-page rounded border p-4 print:rounded-none print:border-0 print:p-0">
            <header className={cn('mb-3 flex items-end justify-between border-b-4 pb-2', getAllianceColorClasses(color).border)}>
                <div>
                    <div className="text-sm text-gray-600">{event?.name}</div>
                    <div className="text-xl font-bold">
                        {getMatchTitle(match)} · <span className={cn('capitalize', getAllianceColorClasses(color).text)}>{color} alliance</span>
                    </div>
                    <div className="text-sm text-gray-600">
                        {[formatMatchTime(match.start_time, event?.timezone), getFieldLabel(match, event?.field_count ?? 1)]
                            .filter(Boolean)
                            .join(' · ')}
                    </div>
                </div>
                <div className="text-right text-sm">
                    Referee <span className="inline-block w-40 border-b border-gray-500" />
                </div>
            </header>

            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr className="border-b-2 text-left">
                        <th className="py-1">Scoring</th>
                        <th className="w-28 py-1 text-right">Points</th>
                        {teams.map((matchAlliance) => (
                            <th key={matchAlliance.id} className="w-24 py-1 text-center font-mono">
                                {matchAlliance.team?.number}
                            </th>
                        ))}
                        <th className="w-24 py-1 text-center">Alliance</th>
                    </tr>
                </thead>
                {sections.map((section) => (
                    <tbody key={section.title} className="break-inside-avoid">
                        <tr>
                            <td colSpan={teams.length + 3} className="pt-3 pb-1 text-xs font-bold text-gray-600 uppercase">
                                {section.title}
                            </td>
                        </tr>
                        {section.scoreTypes.map((scoreType) => (
                            <tr key={scoreType.id} className="border-b">
                                <td className="py-1.5">
                                    {scoreType.choice_set && <span className="text-gray-500">{scoreType.choice_set}: </span>}
                                    {scoreType.name}
                                </td>
                                <td className="py-1.5 text-right text-gray-600 tabular-nums">{describePoints(scoreType)}</td>
                                {teams.map((matchAlliance) => (
                                    <td key={matchAlliance.id} className="py-1.5 text-center">
                                        {scoreType.target === 'team' && <EntryBox kind={scoreType.kind} />}
                                    </td>
                                ))}
                                <td className="py-1.5 text-center">{scoreType.target === 'alliance' && <EntryBox kind={scoreType.kind} />}</td>
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>

            <p className="mt-3 text-xs text-gray-500">Boxes: write a count · squares: tick if done · circles: mark one per group.</p>
        </section>
    );
}

/**
 * Blank paper scoresheets built from the game's own score types, one per
 * alliance per match, for when a tablet fails.
 */
export default function ScoresheetsReport() {
    const { matches, groups, scoreTypes } = usePage<SharedData & { matches: CompetitionMatch[]; groups: Group[]; scoreTypes: SheetScoreType[] }>()
        .props;
    const [matchId, setMatchId] = useState('unplayed');
    const sections = sectionsFor(groups, scoreTypes);

    const visible =
        matchId === 'unplayed'
            ? matches.filter((match) => match.status === 'upcoming')
            : matchId === 'all'
              ? matches
              : matches.filter((match) => String(match.id) === matchId);

    return (
        <PrintLayout
            title="Paper scoresheets"
            toolbar={
                <select className="rounded border px-2 py-1 text-sm" value={matchId} onChange={(changeEvent) => setMatchId(changeEvent.target.value)}>
                    <option value="unplayed">Matches not played yet</option>
                    <option value="all">Every match</option>
                    {matches.map((match) => (
                        <option key={match.id} value={match.id}>
                            {getMatchTitle(match)}
                        </option>
                    ))}
                </select>
            }
        >
            {sections.length === 0 && <p className="text-muted-foreground py-12 text-center">This game has no score types yet.</p>}
            {visible.length === 0 && sections.length > 0 && <p className="text-muted-foreground py-12 text-center">No matches to print.</p>}
            {sections.length > 0 && (
                <div className="space-y-6 print:space-y-0">
                    {visible.flatMap((match) =>
                        allianceColorsOf(match).map((color) => (
                            <AllianceSheet key={`${match.id}-${color}`} match={match} color={color} sections={sections} />
                        )),
                    )}
                </div>
            )}
        </PrintLayout>
    );
}
