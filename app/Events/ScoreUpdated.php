<?php

namespace App\Events;

use App\Models\CompetitionMatch;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Queue\SerializesModels;

class ScoreUpdated implements ShouldBroadcast
{
    use SerializesModels;

    public $match;

    public function __construct(CompetitionMatch $match)
    {
        $this->match = $match->load('matchAlliances.team', 'matchAlliances.alliance');
    }

    public function broadcastOn()
    {
        return new Channel('matches.'.$this->match->id);
    }

    public function broadcastWith()
    {
        return [
            'match' => $this->match,
        ];
    }
}
