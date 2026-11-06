import { TeamCards } from '@/components/match-control/team-cards';
import { formatScoreName } from '@/components/scoring/score-controls';
import { TeamCardBadge } from '@/components/team-card-badge';
import { useApi } from '@/hooks/use-api';
import { useMatch, useScoreTypes } from '@/hooks/use-match';
import AppLayout from '@/layouts/app-layout';
import { eventUrl } from '@/lib/event';
import { getAllianceMembers, getAllianceScore, getMatchTitle } from '@/lib/match-utils';
import { findSubmission, seatsOf } from '@/lib/referee-seats';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type RefereeRole, type ScoreType } from '@/types';
import { Head, Link, useProp } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useMemo, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Head Referee', href: '/head-referee' }];

const ALLIANCES = ['red', 'blue'] as const;
type Color = (typeof ALLIANCES)[number];

const ROLE_LABELS: Record<RefereeRole, string> = { scoring: 'Scorer', penalty: 'Referee' };

function ScoreRow({ label, red, blue, flip, className }: { label: ReactNode; red: ReactNode; blue: ReactNode; flip: boolean; className?: string }) {
    const [left, right] = flip ? [blue, red] : [red, blue];

    return (
        <div className={cn('grid grid-cols-[1fr_minmax(8rem,auto)_1fr] items-center gap-2 border-b border-[#dee2e6] py-1 text-center', className)}>
            <div>{left}</div>
            <div className="font-bold">{label}</div>
            <div>{right}</div>
        </div>
    );
}

function TabletStatus({ match, color, role, tablets }: { match: CompetitionMatch; color: Color; role: RefereeRole; tablets: string[] }) {
    const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;

    if (allianceId === undefined) {
        return <span>—</span>;
    }

    if (findSubmission(match, allianceId, role)) {
        return <span className="rounded bg-[#198754] px-2 py-0.5 text-white">Submitted</span>;
    }

    if (tablets.length > 1) {
        return <span className="rounded bg-[#ffc107] px-2 py-0.5 text-black">Conflict: {tablets.join(', ')}</span>;
    }

    return tablets.length === 1 ? <span>Scoring ({tablets[0]})</span> : <span className="text-[#dc3545]">No Tablet</span>;
}

function countFor(match: CompetitionMatch, color: Color, scoreType: ScoreType): number {
    const allianceIds = new Set(getAllianceMembers(match, color).map((member) => member.alliance.id));

    return (match.scores ?? []).filter((score) => score.score_type_id === scoreType.id && allianceIds.has(score.alliance_id ?? -1)).length;
}

function ScoreGroup({ title, scoreTypes, match, flip }: { title: string; scoreTypes: ScoreType[]; match: CompetitionMatch; flip: boolean }) {
    const [open, setOpen] = useState(true);

    return (
        <details open={open} className="mb-2">
            <summary
                onClick={(clickEvent) => {
                    clickEvent.preventDefault();
                    setOpen(!open);
                }}
                className="block w-full cursor-pointer rounded bg-[#6c757d] px-2 py-1 text-center text-sm text-white hover:bg-[#5c636a]"
            >
                {title}
            </summary>
            {scoreTypes.map((scoreType) => (
                <ScoreRow
                    key={scoreType.id}
                    flip={flip}
                    label={<span className="capitalize">{formatScoreName(scoreType.name)}</span>}
                    red={countFor(match, 'red', scoreType)}
                    blue={countFor(match, 'blue', scoreType)}
                />
            ))}
        </details>
    );
}

function ActiveMatchTab({ match, matches }: { match: CompetitionMatch; matches: CompetitionMatch[] }) {
    const api = useApi();
    const [flip, setFlip] = useState(false);
    const { data: scoreTypes = [] } = useScoreTypes();
    const { data: seats } = useQuery({
        queryKey: ['referee-seats', match.id],
        queryFn: () => api.getRefereeSeats(match.id),
        enabled: match.status === 'ongoing',
        refetchInterval: 5000,
        refetchIntervalInBackground: true,
    });

    const groups = useMemo(() => {
        const byGroup = new Map<string, { order: number; scoreTypes: ScoreType[] }>();
        for (const scoreType of scoreTypes) {
            const name = scoreType.group?.name ?? 'Other';
            const entry = byGroup.get(name) ?? { order: scoreType.group?.display_order ?? Number.MAX_SAFE_INTEGER, scoreTypes: [] };
            entry.scoreTypes.push(scoreType);
            byGroup.set(name, entry);
        }

        return [...byGroup.entries()].sort(([, a], [, b]) => a.order - b.order);
    }, [scoreTypes]);

    const tabletsFor = (color: Color, role: RefereeRole) => seats?.seats[String(getAllianceMembers(match, color)[0]?.alliance.id)]?.[role] ?? [];
    const roles: RefereeRole[] =
        ALLIANCES.some((color) => {
            const allianceId = getAllianceMembers(match, color)[0]?.alliance.id;

            return allianceId !== undefined && seatsOf(match, allianceId).includes('penalty');
        }) || scoreTypes.some((scoreType) => scoreType.referee === 'penalty')
            ? ['scoring', 'penalty']
            : ['scoring'];

    return (
        <>
            <h4 className="mb-2 text-center text-2xl font-medium">{getMatchTitle(match)}</h4>
            <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={() => setFlip(!flip)} className="rounded-md bg-[#0dcaf0] px-3 py-1.5 text-black hover:bg-[#31d2f2]">
                    Flip Alliances
                </button>
                <Link href={eventUrl('/match-control')} className="rounded-md bg-[#0dcaf0] px-3 py-1.5 text-black hover:bg-[#31d2f2]">
                    Match Control
                </Link>
            </div>
            <hr className="my-4" />

            <ScoreRow
                flip={flip}
                label="Tablet Status"
                red={<span className="font-bold text-[#ed1c24]">Red</span>}
                blue={<span className="font-bold text-[#0066b3]">Blue</span>}
            />
            {match.status === 'ongoing' ? (
                roles.map((role) => (
                    <ScoreRow
                        key={role}
                        flip={flip}
                        label={ROLE_LABELS[role]}
                        red={<TabletStatus match={match} color="red" role={role} tablets={tabletsFor('red', role)} />}
                        blue={<TabletStatus match={match} color="blue" role={role} tablets={tabletsFor('blue', role)} />}
                    />
                ))
            ) : (
                <ScoreRow
                    flip={flip}
                    label="State"
                    red={match.status === 'completed' ? 'Committed' : 'Unplayed'}
                    blue={match.status === 'completed' ? 'Committed' : 'Unplayed'}
                />
            )}
            <ScoreRow
                flip={flip}
                label="Score"
                className="text-4xl"
                red={<span className="font-bold text-[#ed1c24] tabular-nums">{getAllianceScore(match, 'red')}</span>}
                blue={<span className="font-bold text-[#0066b3] tabular-nums">{getAllianceScore(match, 'blue')}</span>}
            />
            <hr className="my-4" />

            {groups.map(([name, group]) => (
                <ScoreGroup key={name} title={`${name} Scores`} scoreTypes={group.scoreTypes} match={match} flip={flip} />
            ))}
            <hr className="my-4" />

            <h6 className="mb-2 text-center font-medium">Teams / Cards</h6>
            <ScoreRow
                flip={flip}
                label="Teams"
                red={getAllianceMembers(match, 'red').map((member) => (
                    <div key={member.id}>
                        {member.team.number} <TeamCardBadge card={member.card} />
                    </div>
                ))}
                blue={getAllianceMembers(match, 'blue').map((member) => (
                    <div key={member.id}>
                        {member.team.number} <TeamCardBadge card={member.card} />
                    </div>
                ))}
            />
            <div className="mt-3">
                <TeamCards match={match} matches={matches} />
            </div>
        </>
    );
}

/**
 * The head referee's page, like FTC Live's: the running match with each
 * referee tablet's status, what every alliance has been scored for, and the
 * cards for its teams.
 */
export default function HeadReferee() {
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const running = matches.find((match) => match.status === 'ongoing');
    const lastPlayed = [...matches].reverse().find((match) => match.status === 'completed');
    const { data: liveMatch } = useMatch(running?.id ?? lastPlayed?.id ?? null, 2000);
    const match = liveMatch ?? running ?? null;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Head Referee" />
            <h1 className="mb-4 text-center text-[2rem] leading-tight font-medium">Head Referee</h1>

            <ul className="mb-4 flex flex-wrap border-b border-[#dee2e6]" role="tablist">
                <li>
                    <span
                        role="tab"
                        aria-selected="true"
                        className="-mb-px block rounded-t-md border border-[#dee2e6] border-b-white bg-white px-4 py-2 text-[#495057]"
                    >
                        Active Match
                    </span>
                </li>
                <li>
                    <Link href={eventUrl('/reports/field-notes')} className="block px-4 py-2 text-[#0d6efd] hover:text-[#0a58ca]">
                        Notes
                    </Link>
                </li>
                <li>
                    <Link href={eventUrl('/reports/scoresheets')} className="block px-4 py-2 text-[#0d6efd] hover:text-[#0a58ca]">
                        Scoresheets
                    </Link>
                </li>
            </ul>

            {match ? (
                <ActiveMatchTab match={match} matches={matches} />
            ) : (
                <div className="rounded-md border border-[#9eeaf9] bg-[#cff4fc] px-4 py-3 text-center text-[#055160]">No Active Match</div>
            )}
        </AppLayout>
    );
}
