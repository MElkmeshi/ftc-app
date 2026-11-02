<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;

/**
 * Signals that the elimination bracket changed. It carries no payload: pages
 * holding the bracket as an Inertia live prop reload it when this arrives.
 */
class EliminationBracketUpdated implements ShouldBroadcastNow, ShouldDispatchAfterCommit
{
    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('elimination')];
    }

    /**
     * @return array<string, never>
     */
    public function broadcastWith(): array
    {
        return [];
    }
}
