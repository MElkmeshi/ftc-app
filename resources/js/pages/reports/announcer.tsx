import PrintLayout from '@/layouts/print-layout';
import { formatMatchTime, getAllianceColorClasses, getFieldLabel, getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, describeStanding, membersOf, type Standing } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';

/**
 * The announcer's sheet (FTC Live's Announcer report): every match with each
 * team's name, where it is from, its rookie year and how it is doing.
 */
export default function AnnouncerReport() {
    const { event, matches, standings } = usePage<SharedData & { matches: CompetitionMatch[]; standings: Record<number, Standing> }>().props;
    const [onlyUnplayed, setOnlyUnplayed] = useState(true);
    const visible = onlyUnplayed ? matches.filter((match) => match.status === 'upcoming' || match.status === 'ongoing') : matches;

    return (
        <PrintLayout
            title="Announcer sheet"
            toolbar={
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={onlyUnplayed} onChange={(changeEvent) => setOnlyUnplayed(changeEvent.target.checked)} />
                    Only matches not played yet
                </label>
            }
        >
            <p className="mb-4 hidden text-sm print:block">{event?.name} · Announcer sheet</p>
            {visible.length === 0 && <p className="text-muted-foreground py-12 text-center">No matches to announce.</p>}
            <div className="space-y-4">
                {visible.map((match) => (
                    <section key={match.id} className="break-inside-avoid rounded border p-3">
                        <h2 className="mb-2 font-bold">
                            {[getMatchTitle(match), formatMatchTime(match.start_time, event?.timezone), getFieldLabel(match, event?.field_count ?? 1)]
                                .filter(Boolean)
                                .join(' · ')}
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            {allianceColorsOf(match).map((color) => (
                                <div key={color} className={cn('border-l-4 pl-3', getAllianceColorClasses(color).border)}>
                                    <div className={cn('text-xs font-semibold uppercase', getAllianceColorClasses(color).text)}>{color}</div>
                                    {membersOf(match, color).map((matchAlliance) => (
                                        <div key={matchAlliance.id} className="py-1">
                                            <div>
                                                <span className="font-mono font-bold">{matchAlliance.team?.number}</span> {matchAlliance.team?.name}
                                            </div>
                                            <div className="text-xs text-gray-600">
                                                {[
                                                    matchAlliance.team?.organization,
                                                    matchAlliance.team?.city,
                                                    matchAlliance.team?.rookie_year ? `Rookie year ${matchAlliance.team.rookie_year}` : null,
                                                    describeStanding(standings[matchAlliance.team?.id ?? 0]),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </PrintLayout>
    );
}
