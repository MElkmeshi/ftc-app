import { useMatch, useMatches, useUpdateScore } from '@/hooks/use-match';
import { MatchAlliance, ScoreUpdatedEvent } from '@/types';
import { Head } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import React, { useState } from 'react';

const RefereePage: React.FC = () => {
    const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);

    const { data: matches = [], isLoading } = useMatches();
    const { data: match } = useMatch(selectedMatchId);
    const updateScore = useUpdateScore();

    useEcho<ScoreUpdatedEvent>(selectedMatchId ? `matches.${selectedMatchId}` : '', 'ScoreUpdated', (payload) => {});

    const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedMatchId(Number(e.target.value));
    };

    const handleScoreUpdate = (ma: MatchAlliance, newScore: number) => {
        if (!match) return;
        updateScore.mutate({
            matchId: match.id,
            data: { match_alliances: [{ id: ma.id, score: newScore }] },
        });
    };

    return (
        <div>
            <Head title="Referee Panel" />
            <h1>Referee Panel</h1>
            {isLoading && <p>Loading matches...</p>}
            <select value={selectedMatchId ?? ''} onChange={handleSelect}>
                <option value="">Select Match</option>
                {matches.map((m) => (
                    <option key={m.id} value={m.id}>
                        Match #{m.match_number}
                    </option>
                ))}
            </select>
            {match && (
                <div style={{ marginTop: 24 }}>
                    <h2>Live Score for Match #{match.match_number}</h2>
                    <ul>
                        {match.match_alliances.map((ma) => (
                            <li key={ma.id}>
                                {ma.team.team_name}: {ma.score} <button onClick={() => handleScoreUpdate(ma, ma.score + 1)}>+1</button>
                                <button onClick={() => handleScoreUpdate(ma, Math.max(0, ma.score - 1))}>-1</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RefereePage;
