import AppLayout from '@/layouts/app-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type SharedData } from '@/types';
import { Head, usePage } from '@inertiajs/react';

interface HistoryEntry {
    at: string;
    kind: 'scored' | 'correction' | 'removed' | 'submitted' | 'started' | 'ended' | 'cancelled';
    alliance: string | null;
    description: string;
    by: string | null;
    points: number | null;
    totals: Record<string, number>;
}

const WIN_BACKGROUNDS: Record<string, string> = {
    red: 'bg-[#FF4444]!',
    blue: 'bg-[#44AAFF]!',
    tie: 'bg-[#CCCCCC]!',
};

function formatRecordTime(at: string, timeZone?: string): string {
    const options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' };

    try {
        return new Date(at).toLocaleString('en-US', { ...options, timeZone });
    } catch {
        return new Date(at).toLocaleString('en-US', options);
    }
}

function shortMatchName(match: CompetitionMatch): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    if (match.type === 'qualification') {
        return `Q${match.number}`;
    }

    return getMatchTitle(match);
}

function leaderOf(totals: Record<string, number>, colors: string[]): string {
    const best = Math.max(...colors.map((color) => totals[color] ?? 0));
    const leaders = colors.filter((color) => (totals[color] ?? 0) === best);

    return leaders.length === 1 ? (leaders.at(0) ?? 'tie') : 'tie';
}

export default function MatchHistory() {
    const { event, match, entries } = usePage<SharedData & { match: CompetitionMatch; entries: HistoryEntry[] }>().props;
    const title = getMatchTitle(match);
    const colors = Object.keys(entries.at(0)?.totals ?? {}).sort((a, b) => (a === 'red' ? -1 : b === 'red' ? 1 : a.localeCompare(b)));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Match Results', href: '/schedule?view=results' },
        { title: 'History', href: `/matches/${match.id}/history` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${title} history`} />

            <div>
                <div className={cn(bs.h2, 'text-center')}>{event?.code}</div>
                <div className={cn(bs.h2, 'text-center')}>History for {shortMatchName(match)}</div>
                <br />
                <div className={cn(bs.h5, 'text-center')}>Most Recent First</div>
                <table className={cn(bs.table, bs.tableStriped, '[&_td]:text-center [&_th]:text-left')}>
                    <thead>
                        <tr>
                            <th scope="col">Record #</th>
                            <th scope="col">Type</th>
                            <th scope="col">Time</th>
                            <th scope="col">Winner</th>
                            {colors.map((color) => (
                                <th key={color} scope="col" className="capitalize">
                                    {color} Score
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry, index) => {
                            const leader = leaderOf(entry.totals, colors);

                            return (
                                <tr key={`${entry.at}-${index}`}>
                                    <td>{entries.length - index}</td>
                                    <td>{entry.description}</td>
                                    <td>{formatRecordTime(entry.at, event?.timezone)}</td>
                                    <td className={cn('capitalize', WIN_BACKGROUNDS[leader])}>{leader}</td>
                                    {colors.map((color) => (
                                        <td key={color}>{entry.totals[color] ?? 0}</td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </AppLayout>
    );
}
