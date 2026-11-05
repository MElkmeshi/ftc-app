import { TeamCardBadge } from '@/components/team-card-badge';
import PrintLayout from '@/layouts/print-layout';
import { getMatchTitle } from '@/lib/match-utils';
import { type CompetitionMatch, type SharedData, type Team, type TeamCard } from '@/types';
import { usePage } from '@inertiajs/react';

interface TeamCards {
    team: Pick<Team, 'id' | 'number' | 'name'>;
    cards: { card: TeamCard; match: Pick<CompetitionMatch, 'id' | 'number' | 'type' | 'round'> }[];
}

/**
 * Every card given so far, by team (FTC Live's head referee tracking
 * report).
 */
export default function CardsReport() {
    const { event, teams } = usePage<SharedData & { teams: TeamCards[] }>().props;

    return (
        <PrintLayout title="Cards">
            <p className="text-sm text-gray-600">{event?.name}</p>
            <h2 className="mb-3 text-2xl font-bold">Cards</h2>
            {teams.length === 0 ? (
                <p className="text-muted-foreground py-12 text-center">No cards have been given.</p>
            ) : (
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b-2 text-left">
                            <th className="w-20 py-1">Team</th>
                            <th className="w-56 py-1">Name</th>
                            <th className="w-20 py-1 text-center">Yellow</th>
                            <th className="w-20 py-1 text-center">Red</th>
                            <th className="py-1">Matches</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(({ team, cards }) => (
                            <tr key={team.id} className="break-inside-avoid border-b align-top">
                                <td className="py-2 font-mono font-bold">{team.number}</td>
                                <td className="py-2">{team.name}</td>
                                <td className="py-2 text-center tabular-nums">{cards.filter((entry) => entry.card === 'yellow').length}</td>
                                <td className="py-2 text-center tabular-nums">{cards.filter((entry) => entry.card === 'red').length}</td>
                                <td className="py-2">
                                    <span className="flex flex-wrap gap-x-3 gap-y-1">
                                        {cards.map((entry) => (
                                            <span key={entry.match.id} className="flex items-center gap-1">
                                                <TeamCardBadge card={entry.card} /> {getMatchTitle(entry.match)}
                                            </span>
                                        ))}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </PrintLayout>
    );
}
