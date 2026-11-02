<?php

namespace App\Events;

use App\Models\CompetitionMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Queue\SerializesModels;

class ScoreUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use InteractsWithSockets, SerializesModels;

    public CompetitionMatch $match;

    public function __construct(CompetitionMatch $match)
    {
        $this->match = $match->loadMissing('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
    }

    public function broadcastOn(): Channel
    {
        return new Channel('matches.'.$this->match->id);
    }

    public function broadcastWith(): array
    {
        return [
            'match' => $this->match,
        ];
    }
}
