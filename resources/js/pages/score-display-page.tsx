import { useActiveMatch } from '@/hooks/use-match';
import { ScoreUpdatedEvent } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import React from 'react';

const ScoreDisplayPage: React.FC = () => {
    const { data: activeMatch, isLoading, refetch } = useActiveMatch();

    useEcho<ScoreUpdatedEvent>(activeMatch ? `matches.${activeMatch.id}` : '', 'ScoreUpdated', () => refetch());

    if (isLoading) return <div>Loading...</div>;
    if (!activeMatch) return <div>No active match yet!</div>;

    return (
        <div>
            <Head title="Score Display" />
            <h1>Score Display</h1>
            <h2>Match #{activeMatch.match_number}</h2>
            <ul>
                {activeMatch.match_alliances.map((ma) => (
                    <li key={ma.id}>
                        {ma.team.team_name}: {ma.score}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ScoreDisplayPage;
