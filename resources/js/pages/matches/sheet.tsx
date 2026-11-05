import { TeamCardBadge } from '@/components/team-card-badge';
import { useChangedAt } from '@/hooks/use-changed-at';
import EventPageLayout from '@/layouts/event-page-layout';
import { formatMatchTime, getAllianceColorClasses, getAllianceMembers, getAllianceScore, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type Group, type ScoreType, type SharedData } from '@/types';
import { Head, Link, usePage, useProp } from '@inertiajs/react';

type SheetScoreType = Pick<ScoreType, 'id' | 'name' | 'points' | 'group_id' | 'awarded_to' | 'target'>;

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

function AllianceSheet({
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
    const classes = getAllianceColorClasses(color);
    const sections = buildSections(match, color, scoreTypes, groups);
    const total = getAllianceScore(match, color);

    return (
        <section className={cn('break-inside-avoid overflow-hidden rounded-lg border-2', classes.border)}>
            <header className={cn('flex items-center justify-between px-4 py-3 text-white', classes.bg)}>
                <div>
                    <div className="text-xs font-semibold tracking-wide uppercase opacity-80">{color} alliance</div>
                    <div className="flex flex-wrap items-center gap-x-3 font-mono text-lg font-semibold">
                        {getAllianceMembers(match, color).map((matchAlliance) => (
                            <span key={matchAlliance.id} className="flex items-center gap-1">
                                {matchAlliance.team?.number}
                                <TeamCardBadge card={matchAlliance.card} className="font-sans" />
                            </span>
                        ))}
                    </div>
                </div>
                <div className="text-4xl font-black tabular-nums">{total}</div>
            </header>
            {sections.length === 0 ? (
                <p className="text-muted-foreground px-4 py-6 text-center text-sm">No points yet.</p>
            ) : (
                <div className="divide-y">
                    {sections.map((section) => (
                        <div key={section.title} className="px-4 py-2">
                            <div className="text-muted-foreground flex justify-between py-1 text-xs font-semibold uppercase">
                                <span>{section.title}</span>
                                <span className="tabular-nums">{section.points}</span>
                            </div>
                            <ul className="text-sm">
                                {section.lines.map((line) => (
                                    <li key={line.key} className="flex items-baseline justify-between gap-3 py-0.5">
                                        <span>
                                            {line.label}
                                            {line.count > 1 && <span className="text-muted-foreground"> × {line.count}</span>}
                                            {line.detail && <span className="text-muted-foreground block text-xs">{line.detail}</span>}
                                        </span>
                                        <span className="font-medium tabular-nums">{line.points}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

const STATUS_LABELS: Record<string, string> = {
    upcoming: 'Not played yet',
    ongoing: 'On the field now — scores are still coming in',
    completed: 'Final',
    cancelled: 'Cancelled',
};

/**
 * One match's scoresheet: every point by alliance and group (FTC Live's
 * Scoresheet page). It updates live while the match is scored.
 */
export default function MatchSheet() {
    const { event, scoreTypes, groups } = usePage<SharedData & { scoreTypes: SheetScoreType[]; groups: Group[] }>().props;
    const { value: match } = useProp<CompetitionMatch>('match');
    const updatedAt = useChangedAt(match);
    const scoreTypesById = new Map(scoreTypes.map((scoreType) => [scoreType.id, scoreType]));

    if (!match) {
        return null;
    }

    const colors = allianceColorsOf(match);
    const totals = colors.map((color) => getAllianceScore(match, color));
    const best = Math.max(...totals);
    const winners = colors.filter((_, index) => totals.at(index) === best);
    const title = getMatchTitle(match);

    return (
        <EventPageLayout title={title} updatedAt={updatedAt}>
            <Head title={title} />

            <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span>
                    {[formatMatchTime(match.start_time, event?.timezone), getFieldLabel(match, event?.field_count ?? 1)].filter(Boolean).join(' · ')}
                </span>
                <span className={cn('font-medium', match.status === 'completed' && 'text-foreground')}>
                    {STATUS_LABELS[match.status] ?? match.status}
                </span>
                {match.status === 'completed' && (
                    <span className="text-foreground font-semibold">
                        {winners.length === 1 ? <span className="capitalize">{winners.at(0)} wins</span> : 'Tie'}
                    </span>
                )}
                <Link
                    href={`/event/${event?.code}/matches/${match.id}/history`}
                    className="text-muted-foreground ml-auto text-xs hover:underline print:hidden"
                >
                    Change history (head referee)
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {colors.map((color) => (
                    <AllianceSheet key={color} match={match} color={color} scoreTypes={scoreTypesById} groups={groups} />
                ))}
            </div>
        </EventPageLayout>
    );
}
