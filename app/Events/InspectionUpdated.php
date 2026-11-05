<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * A team's inspection changed, so the inspection pages and the status board
 * reload their list.
 */
class InspectionUpdated implements ShouldBroadcastNow
{
    public function __construct(public string $eventCode, public int $teamId) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel("event.{$this->eventCode}.inspection")];
    }
}
