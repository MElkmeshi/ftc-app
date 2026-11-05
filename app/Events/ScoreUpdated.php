<?php

namespace App\Events;

use App\Models\CompetitionMatch;
use App\Support\MatchBroadcastPayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Queue\SerializesModels;

class ScoreUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    use InteractsWithSockets, SerializesModels;

    public CompetitionMatch $match;

    public string $eventCode;

    public function __construct(CompetitionMatch $match)
    {
        $this->match = $match->loadMissing('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        $this->eventCode = $match->event()->value('code');
    }

    /**
     * The match-control channel lets pages that aggregate every match (rankings,
     * bracket) refresh their live props without knowing which match changed.
     *
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("event.{$this->eventCode}.matches.{$this->match->id}"),
            new Channel("event.{$this->eventCode}.match-control"),
        ];
    }

    /**
     * @return array{match_id: int, match?: CompetitionMatch}
     */
    public function broadcastWith(): array
    {
        return MatchBroadcastPayload::for($this->match);
    }
}
