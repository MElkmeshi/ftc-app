import { placeLabel } from '@/lib/award-utils';
import { bs } from '@/lib/bootstrap';
import { type Team } from '@/types';
import { router } from '@inertiajs/react';

interface AwardWinnerRow {
    id: number;
    place: number;
    recipient: string | null;
    team: Pick<Team, 'id' | 'number' | 'name'> | null;
}

export interface AwardRow {
    id: number;
    name: string;
    description: string | null;
    places: number;
    winners: AwardWinnerRow[];
}

export interface AwardPresentation {
    award_id: number;
    revealed: number;
}

export function winnersText(award: AwardRow, place: number): string {
    return award.winners
        .filter((winner) => winner.place === place)
        .map((winner) => [winner.team ? `${winner.team.number} ${winner.team.name}` : null, winner.recipient].filter(Boolean).join(' - '))
        .join(', ');
}

function PresentControls({ award, base, presenting }: { award: AwardRow; base: string; presenting: AwardPresentation | null }) {
    const isShowing = presenting?.award_id === award.id;
    const revealed = isShowing ? presenting.revealed : 0;
    const nextPlace = award.places - revealed;
    const present = (count: number) => router.post(`${base}/awards/${award.id}/present`, { revealed: count }, { preserveScroll: true });

    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {!isShowing && (
                <button type="button" className={bs.btnPrimary} onClick={() => present(0)}>
                    Show Award
                </button>
            )}
            {isShowing && nextPlace >= 1 && (
                <button type="button" className={bs.btnPrimary} onClick={() => present(revealed + 1)}>
                    Reveal {placeLabel(nextPlace, award.places)}
                </button>
            )}
            {isShowing && revealed > 0 && (
                <button type="button" className={bs.btnSecondary} onClick={() => present(revealed - 1)}>
                    Undo Reveal
                </button>
            )}
        </div>
    );
}

export function PresentAwards({
    awards,
    base,
    locked,
    presenting,
}: {
    awards: AwardRow[];
    base: string;
    locked: boolean;
    presenting: AwardPresentation | null;
}) {
    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-x-6">
                <h2 className={bs.h2}>Present Awards</h2>
                {presenting && (
                    <button
                        type="button"
                        className={`${bs.btnSecondary} mb-2`}
                        onClick={() => router.delete(`${base}/awards/presenting`, { preserveScroll: true })}
                    >
                        Clear Display
                    </button>
                )}
            </div>
            {locked ? (
                <table className={`${bs.table} ${bs.tableStriped}`}>
                    <tbody>
                        {awards.map((award) => (
                            <tr key={award.id}>
                                <td>{award.name}</td>
                                <td>
                                    {Array.from({ length: award.places }, (_, index) => (
                                        <div key={index}>
                                            {award.places > 1 && `${placeLabel(index + 1, award.places)}: `}
                                            {winnersText(award, index + 1) || 'NOT GIVEN'}
                                        </div>
                                    ))}
                                </td>
                                <td>
                                    <PresentControls award={award} base={base} presenting={presenting} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <div>Awards must be finalized before they can be presented.</div>
            )}
        </div>
    );
}
