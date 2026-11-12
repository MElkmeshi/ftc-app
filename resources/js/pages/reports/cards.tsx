import PrintLayout, { ReportRow } from '@/layouts/print-layout';
import { bs } from '@/lib/bootstrap';
import { getMatchTitle } from '@/lib/match-utils';
import { cn } from '@/lib/utils';
import { type CompetitionMatch, type SharedData, type Team, type TeamCard } from '@/types';
import { usePage } from '@inertiajs/react';

type CardMatch = Pick<CompetitionMatch, 'id' | 'number' | 'type' | 'round'>;

interface TeamCards {
    team: Pick<Team, 'id' | 'number' | 'name'>;
    cards: { card: TeamCard; match: CardMatch }[];
}

const LEFT_BORDER = 'border-l border-[#dee2e6]';

const CARD_CLASSES: Record<TeamCard, string> = {
    yellow: 'bg-[yellow]',
    red: 'bg-[red]',
};

function shortMatchName(match: CardMatch): string {
    if (match.type === 'practice') {
        return `P${match.number}`;
    }

    return match.type === 'elimination' ? getMatchTitle(match) : `Q${match.number}`;
}

/**
 * Every card given so far, by team (FTC Live's card report).
 */
export default function CardsReport() {
    const { event, teams } = usePage<SharedData & { teams: TeamCards[] }>().props;

    return (
        <PrintLayout title={`${event?.name ?? ''} Card Report`}>
            <ReportRow>
                <table className={cn(bs.table, bs.tableStriped, 'text-center')}>
                    <thead>
                        <tr>
                            <th scope="col">Team Number</th>
                            <th scope="col" className={LEFT_BORDER}>
                                Team Name
                            </th>
                            <th scope="col" className={LEFT_BORDER}>
                                Yellow
                            </th>
                            <th scope="col">Red</th>
                            <th scope="col" className={LEFT_BORDER}>
                                Match
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(({ team, cards }) => (
                            <tr key={team.id} className="break-inside-avoid">
                                <td>{team.number}</td>
                                <td className={LEFT_BORDER}>{team.name}</td>
                                <td className={LEFT_BORDER}>{cards.filter((entry) => entry.card === 'yellow').length}</td>
                                <td>{cards.filter((entry) => entry.card === 'red').length}</td>
                                <td className={LEFT_BORDER}>
                                    {cards.map((entry) => (
                                        <span
                                            key={entry.match.id}
                                            title={`${entry.card === 'red' ? 'Red' : 'Yellow'} card`}
                                            className={cn('mx-1 inline-block px-2 font-bold [print-color-adjust:exact]', CARD_CLASSES[entry.card])}
                                        >
                                            {shortMatchName(entry.match)}
                                        </span>
                                    ))}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </ReportRow>
        </PrintLayout>
    );
}
