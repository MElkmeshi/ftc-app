import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Team {
    id: number;
    name: string;
}

interface Alliance {
    id: number;
    color: string;
}

interface MatchAlliance {
    id: number;
    match_id: number;
    team_id: number;
    alliance_id: number;
    alliance_pos: number;
    score: number;
    team?: Team;
    alliance?: Alliance;
}

interface Match {
    id: number;
    number: number;
    start_time: string;
    status: string;
    match_alliances: MatchAlliance[];
}

interface Position {
    alliance_id: number;
    alliance_pos: number;
}

interface MatchesPageProps {
    matches: Match[];
    positions: Position[];
    allianceLabels: Record<number, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Matches',
        href: '/competition-matches',
    },
];

export default function MatchesIndex({ matches, positions, allianceLabels }: MatchesPageProps) {
    const getTeamForPosition = (match: Match, position: Position) => {
        const ma = match.match_alliances.find(
            (ma) => ma.alliance_id === position.alliance_id && ma.alliance_pos === position.alliance_pos
        );
        return ma?.team?.name ?? '-';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Matches" />

            <Card>
                <CardHeader>
                    <CardTitle>Competition Matches</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="border-b">
                                    <th className="px-4 py-2 text-left font-medium">Match #</th>
                                    {positions.map((pos) => {
                                        const allianceColor = allianceLabels[pos.alliance_id] ?? 'Alliance';
                                        const label = `${allianceColor.charAt(0).toUpperCase() + allianceColor.slice(1)} ${pos.alliance_pos}`;
                                        return (
                                            <th key={`${pos.alliance_id}-${pos.alliance_pos}`} className="px-4 py-2 text-left font-medium">
                                                {label}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {matches.length === 0 ? (
                                    <tr>
                                        <td colSpan={positions.length + 1} className="px-4 py-8 text-center text-muted-foreground">
                                            No matches found
                                        </td>
                                    </tr>
                                ) : (
                                    matches.map((match) => (
                                        <tr key={match.id} className="border-b hover:bg-muted/50">
                                            <td className="px-4 py-2 font-medium">{match.number}</td>
                                            {positions.map((pos) => (
                                                <td key={`${match.id}-${pos.alliance_id}-${pos.alliance_pos}`} className="px-4 py-2">
                                                    {getTeamForPosition(match, pos)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
