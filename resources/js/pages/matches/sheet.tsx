import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { getAllianceMembers, getAllianceScore, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type Group, type ScoreType } from '@/types';
import { Head, usePage, useProp } from '@inertiajs/react';

export type SheetScoreType = Pick<ScoreType, 'id' | 'name' | 'points' | 'group_id' | 'awarded_to' | 'target'>;

interface SheetLine {
    key: string;
    label: string;
    detail: string | null;
    count: number;
    points: number;
}

interface SheetSection {
    title: string;
    lines: SheetLine[];
    points: number;
}

const ALLIANCE_BACKGROUNDS: Record<string, string> = {
    red: 'bg-[#ED1C24]',
    blue: 'bg-[#0066B3]',
};

const UNDERLINED = 'inline-block min-w-[3em] border-b-[3px] border-black';

function shortMatchName(match: CompetitionMatch): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    if (match.type === 'qualification') {
        return `Q${match.number}`;
    }

    return getMatchTitle(match);
}

function buildSections(match: CompetitionMatch, color: string, scoreTypes: Map<number, SheetScoreType>, groups: Group[]): SheetSection[] {
    const allianceIds = new Set(getAllianceMembers(match, color).map((matchAlliance) => matchAlliance.alliance.id));
    const teamNumbers = new Map(match.match_alliances.map((matchAlliance) => [matchAlliance.team?.id, matchAlliance.team?.number]));
    const lines = new Map<string, SheetLine & { groupId: number | null }>();

    for (const score of match.scores ?? []) {
        if (!allianceIds.has(score.alliance_id ?? -1)) {
            continue;
        }

        const scoreType = score.score_type_id === null ? undefined : scoreTypes.get(score.score_type_id);
        const team = score.team_id === null ? null : `Team ${teamNumbers.get(score.team_id) ?? '?'}`;
        const isFoul = scoreType?.awarded_to === 'opponent';
        const key = `${score.score_type_id ?? 'correction'}:${score.team_id ?? 'alliance'}`;
        const line = lines.get(key) ?? {
            key,
            groupId: isFoul ? null : (scoreType?.group_id ?? null),
            label: scoreType?.name ?? (score.score_type_id === null ? 'Head referee correction' : 'Removed score type'),
            detail: [isFoul ? 'foul by the opponent' : null, team].filter(Boolean).join(' · ') || null,
            count: 0,
            points: 0,
        };

        line.count += 1;
        line.points += score.points ?? scoreType?.points ?? 0;
        lines.set(key, line);
    }

    const sections = groups.map((group) => ({ id: group.id as number | null, title: group.name }));
    sections.push({ id: null, title: 'Fouls & corrections' });

    const built = sections
        .map((section) => {
            const sectionLines = [...lines.values()].filter((line) => line.groupId === section.id).sort((a, b) => a.label.localeCompare(b.label));

            return { title: section.title, lines: sectionLines, points: sectionLines.reduce((sum, line) => sum + line.points, 0) };
        })
        .filter((section) => section.lines.length > 0);

    const adjustment = getAllianceScore(match, color) - built.reduce((sum, section) => sum + section.points, 0);

    if (adjustment === 0) {
        return built;
    }

    return [
        ...built,
        {
            title: 'Adjustment',
            points: adjustment,
            lines: [{ key: 'adjustment', label: 'Entered without a scoresheet', detail: 'e.g. a manual score edit', count: 1, points: adjustment }],
        },
    ];
}

export function AllianceSheet({
    match,
    color,
    scoreTypes,
    groups,
}: {
    match: CompetitionMatch;
    color: string;
    scoreTypes: Map<number, SheetScoreType>;
    groups: Group[];
}) {
    const sections = buildSections(match, color, scoreTypes, groups);

    return (
        <div className="w-full break-inside-avoid px-3 lg:w-6/12">
            <div
                className={cn(
                    'mb-2 p-[0.25em] text-center text-[200%] font-bold text-[#F5FEFD] capitalize',
                    ALLIANCE_BACKGROUNDS[color] ?? 'bg-[#6c757d]',
                )}
            >
                {color} Alliance
            </div>
            <div className={cn(bs.h5, 'text-center font-bold')}>
                <span className="whitespace-nowrap">
                    Match:&nbsp;<span className={UNDERLINED}>{shortMatchName(match)}</span>
                </span>
                &nbsp;
                <span className="whitespace-nowrap">
                    Field:&nbsp;<span className={UNDERLINED}>{match.field}</span>
                </span>
                &nbsp;
            </div>
            {sections.map((section) => (
                <div key={section.title}>
                    <div className={cn(bs.h5, 'bg-[#bfbfbf] text-center font-bold')}>{section.title}</div>
                    <table className="mb-2 w-full text-center">
                        <tbody>
                            {section.lines.map((line) => (
                                <tr key={line.key}>
                                    <th className="w-2/3 text-center font-bold">
                                        {line.label}
                                        {line.count > 1 && ` × ${line.count}`}
                                        {line.detail && ` (${line.detail})`}
                                    </th>
                                    <td>
                                        <div className="border-b-[3px] border-black">{line.points}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}

export default function MatchSheet() {
    const { scoreTypes, groups } = usePage<{ scoreTypes: SheetScoreType[]; groups: Group[] }>().props;
    const { value: match } = useProp<CompetitionMatch>('match');
    const scoreTypesById = new Map(scoreTypes.map((scoreType) => [scoreType.id, scoreType]));

    if (!match) {
        return null;
    }

    const title = getMatchTitle(match);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Match Results', href: '/schedule?view=results' },
        { title, href: `/matches/${match.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={title} />

            <div className="-mx-3 flex flex-wrap">
                {[...allianceColorsOf(match)].reverse().map((color) => (
                    <AllianceSheet key={color} match={match} color={color} scoreTypes={scoreTypesById} groups={groups} />
                ))}
            </div>
        </AppLayout>
    );
}
