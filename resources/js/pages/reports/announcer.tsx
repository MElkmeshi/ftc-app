import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { allianceColorsOf, membersOf } from '@/lib/report-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Fragment, useState } from 'react';

function allianceLabel(color: string): string {
    return `${color.charAt(0).toUpperCase()}${color.slice(1)} Alliance`;
}

/**
 * The announcer's sheet (FTC Live's Announcer report): every match with each
 * team's name, where it is from and its rookie year.
 */
export default function AnnouncerReport() {
    const { event, matches } = usePage<SharedData & { matches: CompetitionMatch[] }>().props;
    const [onlyUnplayed, setOnlyUnplayed] = useState(true);
    const visible = onlyUnplayed ? matches.filter((match) => match.status === 'upcoming' || match.status === 'ongoing') : matches;

    return (
        <PrintLayout
            title={`${event?.name ?? ''} Announcer Report`}
            toolbar={
                <label>
                    <input type="checkbox" checked={onlyUnplayed} onChange={(changeEvent) => setOnlyUnplayed(changeEvent.target.checked)} />
                    Unplayed Only
                </label>
            }
        >
            {visible.map((match) => (
                <ReportRow key={match.id} className="break-inside-avoid">
                    <h3 className={cn(bs.h3, 'w-full text-center')}>{getMatchTitle(match)}</h3>
                    <table className={cn(bs.table, bs.tableBordered, 'text-center')}>
                        <tbody>
                            {allianceColorsOf(match).map((color) => (
                                <Fragment key={color}>
                                    <tr>
                                        <td colSpan={4}>
                                            <b>{allianceLabel(color)}</b>
                                        </td>
                                    </tr>
                                    {membersOf(match, color).map((matchAlliance) => (
                                        <tr key={matchAlliance.id}>
                                            <td>
                                                <b>{matchAlliance.team?.number}</b>
                                                <br />
                                                {matchAlliance.team?.name}
                                            </td>
                                            <td>{matchAlliance.team?.organization}</td>
                                            <td>{matchAlliance.team?.city}</td>
                                            <td>{matchAlliance.team?.rookie_year}</td>
                                        </tr>
                                    ))}
                                </Fragment>
                            ))}
                        </tbody>
                    </table>
                </ReportRow>
            ))}
        </PrintLayout>
    );
}
