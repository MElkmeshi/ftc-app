<?php

namespace App\Events;

use App\Services\CurrentEvent;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;

/**
 * Signals that the elimination bracket changed. It carries no payload: pages
 * holding the bracket as an Inertia live prop reload it when this arrives.
 */
class EliminationBracketUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    public string $eventCode;

    public function __construct()
    {
        $this->eventCode = app(CurrentEvent::class)->require()->code;
    }

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel("event.{$this->eventCode}.elimination")];
    }

    /**
     * @return array<string, never>
     */
    public function broadcastWith(): array
    {
        return [];
    }
}
