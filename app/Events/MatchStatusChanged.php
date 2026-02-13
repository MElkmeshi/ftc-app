<?php

namespace App\Events;

use App\Models\CompetitionMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class MatchStatusChanged implements ShouldBroadcastNow
{
    use SerializesModels;

    public CompetitionMatch $match;

    public string $action;

    public function __construct(CompetitionMatch $match, string $action)
    {
        $this->match = $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        $this->action = $action;
    }

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('match-control'),
            new Channel('matches.'.$this->match->id),
        ];
    }

    /**
     * @return array{match: CompetitionMatch, action: string}
     */
    public function broadcastWith(): array
    {
        return [
            'match' => $this->match,
            'action' => $this->action,
        ];
    }
}
