<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Tells every open screen on this server to check its version now, so a
 * "Reload all screens" reaches them in a second instead of at their next
 * 30-second check.
 */
class ScreensReloadRequested implements ShouldBroadcastNow
{
    public function __construct(public string $version) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('screens')];
    }
}
