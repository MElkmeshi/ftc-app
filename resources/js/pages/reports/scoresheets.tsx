import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { formatMatchTime, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
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
        return <span className="inline-block h-6 w-16 border border-black" />;
    }

    return <span className={cn('inline-block size-5 border border-black', kind === 'choice' && 'rounded-full')} />;
}

function describePoints(scoreType: SheetScoreType): string {
    const points = `${scoreType.points > 0 ? '+' : ''}${scoreType.points}`;

    return scoreType.awarded_to === 'opponent' ? `${points} to opponent` : points;
}

function AllianceSheet({ match, color, sections }: { match: CompetitionMatch; color: string; sections: SheetSection[] }) {
    const { event } = usePage<SharedData>().props;
    const teams = membersOf(match, color);

    return (
        <ReportRow className="break-after-page">
            <h3 className={cn(bs.h3, 'w-full text-center')}>
                {getMatchTitle(match)} <span className="capitalize">{color}</span> Alliance
            </h3>
            <div className="mb-2 flex justify-between px-3">
                <div>
                    {[formatMatchTime(match.start_time, event?.timezone), getFieldLabel(match, event?.field_count ?? 1)].filter(Boolean).join(' ')}
                </div>
                <div>
                    Referee: <span className="inline-block w-40 border-b border-black" />
                </div>
            </div>
            <table className={cn(bs.table, bs.tableBordered, bs.tableSm, 'text-center')}>
                <thead>
                    <tr>
                        <th scope="col" className="text-left">
                            Scoring
                        </th>
                        <th scope="col">Points</th>
                        {teams.map((matchAlliance) => (
                            <th key={matchAlliance.id} scope="col">
                                {matchAlliance.team?.number}
                            </th>
                        ))}
                        <th scope="col">Alliance</th>
                    </tr>
                </thead>
                {sections.map((section) => (
                    <tbody key={section.title} className="break-inside-avoid">
                        <tr>
                            <td colSpan={teams.length + 3} className="text-left">
                                <b>{section.title}</b>
                            </td>
                        </tr>
                        {section.scoreTypes.map((scoreType) => (
                            <tr key={scoreType.id}>
                                <td className="text-left">
                                    {scoreType.choice_set && `${scoreType.choice_set}: `}
                                    {scoreType.name}
                                </td>
                                <td>{describePoints(scoreType)}</td>
                                {teams.map((matchAlliance) => (
                                    <td key={matchAlliance.id}>{scoreType.target === 'team' && <EntryBox kind={scoreType.kind} />}</td>
                                ))}
                                <td>{scoreType.target === 'alliance' && <EntryBox kind={scoreType.kind} />}</td>
                            </tr>
                        ))}
                    </tbody>
                ))}
            </table>
            <p className="mb-4 px-3">Boxes: write a count. Squares: tick if done. Circles: mark one per group.</p>
        </ReportRow>
    );
}

/**
 * Blank paper scoresheets built from the game's own score types, one per
 * alliance per match, for when a tablet fails.
 */
export default function ScoresheetsReport() {
    const { event, matches, groups, scoreTypes } = usePage<
        SharedData & { matches: CompetitionMatch[]; groups: Group[]; scoreTypes: SheetScoreType[] }
    >().props;
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
            title={`${event?.name ?? ''} Scoresheets`}
            toolbar={
                <select
                    aria-label="Matches"
                    className={bs.formSelect}
                    value={matchId}
                    onChange={(changeEvent) => setMatchId(changeEvent.target.value)}
                >
                    <option value="unplayed">Unplayed Matches</option>
                    <option value="all">All Matches</option>
                    {matches.map((match) => (
                        <option key={match.id} value={match.id}>
                            {getMatchTitle(match)}
                        </option>
                    ))}
                </select>
            }
        >
            {sections.length === 0 && <p className="mb-4 text-center">This game has no score types yet.</p>}
            {sections.length > 0 &&
                visible.flatMap((match) =>
                    allianceColorsOf(match).map((color) => (
                        <AllianceSheet key={`${match.id}-${color}`} match={match} color={color} sections={sections} />
                    )),
                )}
        </PrintLayout>
    );
}
