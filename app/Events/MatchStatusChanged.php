<?php

namespace App\Events;

use App\Models\CompetitionMatch;
use App\Support\MatchBroadcastPayload;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;

class MatchStatusChanged implements ShouldBroadcastNow
{
    use SerializesModels;

    public CompetitionMatch $match;

    public string $action;

    public string $eventCode;

    public function __construct(CompetitionMatch $match, string $action)
    {
        $this->match = $match->load('matchAlliances.team', 'matchAlliances.alliance', 'scores.scoreType');
        $this->action = $action;
        $this->eventCode = $match->event()->value('code');
    }

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new Channel("event.{$this->eventCode}.match-control"),
            new Channel("event.{$this->eventCode}.matches.{$this->match->id}"),
        ];
    }

    /**
     * @return array{match_id: int, action: string, match?: CompetitionMatch}
     */
    public function broadcastWith(): array
    {
        return MatchBroadcastPayload::for($this->match, ['action' => $this->action]);
    }
}
