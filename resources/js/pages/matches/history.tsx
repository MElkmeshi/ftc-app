import AppLayout from '@/layouts/app-layout';
import { getAllianceColorClasses, getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem, type CompetitionMatch, type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';

interface HistoryEntry {
    at: string;
    kind: 'scored' | 'correction' | 'removed' | 'submitted' | 'started' | 'ended' | 'cancelled';
    alliance: string | null;
    description: string;
    by: string | null;
    points: number | null;
    totals: Record<string, number>;
}

function formatClock(at: string, timeZone?: string): string {
    const options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit' };

    try {
        return new Date(at).toLocaleTimeString([], { ...options, timeZone });
    } catch {
        return new Date(at).toLocaleTimeString([], options);
    }
}

/**
 * Every change made to a match, newest first, with the running score after
 * each one (FTC Live's View Match History), so the head referee can settle
 * "where did that point go?" questions.
 */
export default function MatchHistory() {
    const { event, match, entries } = usePage<SharedData & { match: CompetitionMatch; entries: HistoryEntry[] }>().props;
    const base = `/event/${event?.code}`;
    const title = getMatchTitle(match);
    const colors = Object.keys(entries.at(0)?.totals ?? {}).sort((a, b) => (a === 'red' ? -1 : b === 'red' ? 1 : a.localeCompare(b)));

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Match Control', href: `${base}/match-control` },
        { title, href: `${base}/matches/${match.id}` },
        { title: 'History', href: `${base}/matches/${match.id}/history` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${title} history`} />

            <div className="flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h1 className="text-2xl font-bold">{title} — change history</h1>
                    <Link href={`${base}/matches/${match.id}`} className="text-primary text-sm hover:underline">
                        Scoresheet
                    </Link>
                </div>

                {entries.length === 0 ? (
                    <p className="text-muted-foreground py-12 text-center">Nothing has happened in this match yet.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                                <tr>
                                    <th className="px-3 py-2 text-left">Time</th>
                                    <th className="px-3 py-2 text-left">Change</th>
                                    <th className="px-3 py-2 text-left">By</th>
                                    <th className="px-3 py-2 text-right">Points</th>
                                    {colors.map((color) => (
                                        <th key={color} className={cn('px-3 py-2 text-right', getAllianceColorClasses(color).text)}>
                                            {color}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {entries.map((entry, index) => (
                                    <tr
                                        key={`${entry.at}-${index}`}
                                        className={cn(
                                            entry.kind === 'removed' && 'text-muted-foreground line-through decoration-1',
                                            entry.kind === 'correction' && 'bg-amber-50 dark:bg-amber-950/40',
                                            ['started', 'ended', 'cancelled', 'submitted'].includes(entry.kind) && 'bg-muted/30',
                                        )}
                                    >
                                        <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{formatClock(entry.at, event?.timezone)}</td>
                                        <td className="px-3 py-1.5">
                                            {entry.alliance && (
                                                <span
                                                    className={cn(
                                                        'mr-2 inline-block size-2 rounded-full',
                                                        getAllianceColorClasses(entry.alliance).bg,
                                                    )}
                                                />
                                            )}
                                            {entry.description}
                                        </td>
                                        <td className="text-muted-foreground px-3 py-1.5">{entry.by ?? ''}</td>
                                        <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                                            {entry.points === null ? '' : entry.points > 0 ? `+${entry.points}` : entry.points}
                                        </td>
                                        {colors.map((color) => (
                                            <td key={color} className="px-3 py-1.5 text-right tabular-nums">
                                                {entry.totals[color] ?? 0}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
