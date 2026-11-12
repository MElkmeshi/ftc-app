import PublicLayout from '@/layouts/public-layout';
import { bs } from '@/lib/bootstrap';
import { determineWinner, formatMatchTime, getAllianceMembers, getAllianceScore, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { Head, Link, usePage, useProp } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { Fragment, useState } from 'react';

type MatchType = CompetitionMatch['type'];

const SCHEDULE_TITLES: Record<MatchType, string> = {
    practice: 'Practice Schedule',
    qualification: 'Qualification Schedule',
    elimination: 'Playoff Schedule',
};

const VIEW_TYPES: Record<string, MatchType> = {
    practice: 'practice',
    qualification: 'qualification',
    playoff: 'elimination',
};

const WIN_BACKGROUNDS: Record<string, string> = {
    red: 'bg-[#FF4444]',
    blue: 'bg-[#44AAFF]',
    tie: 'bg-[#CCCCCC]',
};

function shortMatchName(match: CompetitionMatch): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    if (match.type === 'qualification') {
        return `Q${match.number}`;
    }

    return getMatchTitle(match);
}

function winnerOf(match: CompetitionMatch, colors: string[]): string {
    if (colors.length === 2 && colors.includes('red') && colors.includes('blue')) {
        return determineWinner(match);
    }

    const totals = colors.map((color) => getAllianceScore(match, color));
    const best = Math.max(...totals);
    const leaders = colors.filter((_, index) => totals.at(index) === best);

    return leaders.length === 1 ? (leaders.at(0) ?? 'tie') : 'tie';
}

function slotsOf(matches: CompetitionMatch[], colors: string[]): number[] {
    const size = Math.max(1, ...matches.flatMap((match) => colors.map((color) => getAllianceMembers(match, color).length)));

    return Array.from({ length: size }, (_, index) => index);
}

function ScheduleStats({ matches }: { matches: CompetitionMatch[] }) {
    const appearances = new Map<string, number>();

    for (const match of matches) {
        for (const matchAlliance of match.match_alliances) {
            const number = String(matchAlliance.team?.number ?? '');

            if (number) {
                appearances.set(number, (appearances.get(number) ?? 0) + 1);
            }
        }
    }

    return (
        <div className="-mx-3">
            <table className={bs.table}>
                <tbody>
                    <tr>
                        <td className="text-right">Teams:</td>
                        <td>{appearances.size}</td>
                        <td className="text-right">Matches Per Team:</td>
                        <td>{Math.max(0, ...appearances.values())}</td>
                        <td className="text-right">Matches:</td>
                        <td>{matches.length}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

function ScheduleTable({ matches }: { matches: CompetitionMatch[] }) {
    const { event } = usePage<SharedData>().props;
    const colors = allianceColorsOf(matches[0]);
    const slots = slotsOf(matches, colors);

    return (
        <div className="-mx-3">
            <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                <thead>
                    <tr>
                        <th scope="col">Start</th>
                        <th scope="col">Match</th>
                        <th scope="col">Field</th>
                        {colors.flatMap((color) =>
                            slots.map((slot) => (
                                <th key={`${color}-${slot}`} scope="col" className="capitalize">
                                    {color} {slot + 1}
                                </th>
                            )),
                        )}
                    </tr>
                </thead>
                <tbody>
                    {matches.map((match) => (
                        <tr key={match.id}>
                            <td>{formatMatchTime(match.start_time, event?.timezone)}</td>
                            <td>{getMatchTitle(match)}</td>
                            <td>{match.field}</td>
                            {colors.flatMap((color) =>
                                slots.map((slot) => <td key={`${color}-${slot}`}>{getAllianceMembers(match, color)[slot]?.team?.number}</td>),
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ResultsTable({ matches, keepBackground }: { matches: CompetitionMatch[]; keepBackground: boolean }) {
    const { event, auth } = usePage<SharedData>().props;
    const base = `/event/${event?.code}`;
    const canViewHistory = auth?.can?.controlMatches ?? false;
    const colors = allianceColorsOf(matches[0]);
    const slots = slotsOf(matches, colors);

    return (
        <div className="-mx-3">
            <table className={cn(bs.table, 'text-center [&_td]:align-middle [&_th]:align-middle')}>
                <thead>
                    <tr>
                        <th scope="col">Match</th>
                        <th scope="col">Result</th>
                        {colors.map((color) => (
                            <th key={color} scope="col" className="capitalize">
                                {color}
                            </th>
                        ))}
                        <th scope="col" className="print:hidden">
                            Score breakdown
                        </th>
                        <th scope="col" className="print:hidden">
                            History
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {matches.map((match, matchIndex) => {
                        const rowBackground = matchIndex % 2 === 1 ? 'bg-[#CCCCCC]' : '';
                        const played = match.status === 'completed';
                        const winner = played ? winnerOf(match, colors) : null;
                        const score = colors.map((color) => getAllianceScore(match, color)).join('-');
                        const winnerLetter = winner === 'tie' ? 'T' : (winner ?? '').charAt(0).toUpperCase();

                        return (
                            <Fragment key={match.id}>
                                {slots.map((slot) => (
                                    <tr key={slot}>
                                        {slot === 0 && (
                                            <>
                                                <td rowSpan={slots.length} className={rowBackground}>
                                                    {shortMatchName(match)}
                                                </td>
                                                <td
                                                    rowSpan={slots.length}
                                                    className={cn(
                                                        winner ? (WIN_BACKGROUNDS[winner] ?? rowBackground) : rowBackground,
                                                        keepBackground && 'print:[print-color-adjust:exact]',
                                                    )}
                                                >
                                                    {played ? `${score} ${winnerLetter}` : 'Unplayed'}
                                                </td>
                                            </>
                                        )}
                                        {colors.map((color) => {
                                            const member = getAllianceMembers(match, color)[slot];

                                            return (
                                                <td key={color} className={cn(rowBackground, member?.card === 'red' && 'line-through')}>
                                                    {member?.team?.number}
                                                </td>
                                            );
                                        })}
                                        {slot === 0 && (
                                            <>
                                                <td rowSpan={slots.length} className={cn(rowBackground, 'print:hidden')}>
                                                    {match.status === 'upcoming' ? (
                                                        'Scoresheet'
                                                    ) : (
                                                        <Link href={`${base}/matches/${match.id}`} className={bs.link}>
                                                            Scoresheet
                                                        </Link>
                                                    )}
                                                </td>
                                                <td rowSpan={slots.length} className={cn(rowBackground, 'print:hidden')}>
                                                    {canViewHistory && match.status !== 'upcoming' && (
                                                        <Link href={`${base}/matches/${match.id}/history`} className={bs.link}>
                                                            View Match History
                                                        </Link>
                                                    )}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default function PublicSchedule() {
    const { props, url } = usePage<SharedData>();
    const { value: matches = [] } = useProp<CompetitionMatch[]>('matches');
    const [condensed, setCondensed] = useState(false);
    const [keepBackground, setKeepBackground] = useState(false);
    const eventName = props.event?.name;
    const view = new URLSearchParams(url.split('?')[1] ?? '').get('view');
    const onlyType = view ? VIEW_TYPES[view] : undefined;

    const schedules = (['practice', 'qualification', 'elimination'] as MatchType[])
        .filter((type) => view === null || type === onlyType)
        .map((type) => ({ type, matches: matches.filter((match) => match.type === type) }))
        .filter((schedule) => schedule.matches.length > 0);
    const showResults = (view === null || view === 'results') && matches.length > 0;
    const emptyTitle = view === 'results' ? 'Match Results' : SCHEDULE_TITLES[onlyType ?? 'qualification'];
    const isEmpty = schedules.length === 0 && !showResults;

    const condensedCheckbox = (
        <label>
            <input type="checkbox" checked={condensed} onChange={(changeEvent) => setCondensed(changeEvent.target.checked)} />
            Condensed
        </label>
    );

    return (
        <PublicLayout>
            <Head title={view === 'results' ? 'Match Results' : 'Schedule'} />

            <div className={cn(condensed && '[&_td]:p-0! [&_th]:p-0!')}>
                <br />

                {isEmpty && (
                    <>
                        <div className="-mx-3 flex flex-wrap justify-center">
                            <h2 className={cn(bs.h2, 'w-6/12 px-3 text-center')}>
                                {eventName} {emptyTitle}
                            </h2>
                        </div>
                        <div>&nbsp;</div>
                        <div className="ml-[8.333%]">The schedule has not been created yet.</div>
                    </>
                )}

                {schedules.map((schedule, index) => (
                    <section key={schedule.type}>
                        <div className="-mx-3 flex flex-wrap justify-center">
                            {index === 0 && <div className="w-3/12 px-3 print:hidden">{condensedCheckbox}</div>}
                            <div className="w-6/12 px-3 text-center">
                                <h2 className={bs.h2}>
                                    {eventName} {SCHEDULE_TITLES[schedule.type]}
                                </h2>
                            </div>
                            {index === 0 && (
                                <>
                                    <div className="w-2/12 px-3 print:hidden">&nbsp;</div>
                                    <button
                                        type="button"
                                        className={cn(bs.btnLight, 'w-1/12 print:hidden')}
                                        onClick={() => window.print()}
                                        title="Print"
                                    >
                                        <Printer className="mx-auto size-8" />
                                    </button>
                                </>
                            )}
                        </div>
                        <ScheduleStats matches={schedule.matches} />
                        <ScheduleTable matches={schedule.matches} />
                    </section>
                ))}

                {showResults && (
                    <section>
                        <div className="-mx-3 flex flex-wrap justify-center">
                            <div className="w-4/12 px-3 print:hidden">
                                {condensedCheckbox}{' '}
                                <label>
                                    <input
                                        type="checkbox"
                                        className="me-1"
                                        checked={keepBackground}
                                        onChange={(changeEvent) => setKeepBackground(changeEvent.target.checked)}
                                    />
                                    Keep Background on Print
                                </label>
                            </div>
                            <h2 className={cn(bs.h2, 'w-5/12 px-3 text-center')}>{eventName} Match Results</h2>
                            <div className="w-3/12 px-3 print:hidden">&nbsp;</div>
                        </div>
                        <ResultsTable matches={matches} keepBackground={keepBackground} />
                    </section>
                )}
            </div>
        </PublicLayout>
    );
}
