<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

/**
 * Tells one display screen to switch to new settings chosen in match control.
 */
class DisplayConfigured implements ShouldBroadcastNow
{
    /**
     * @param  array{type: string, mute: bool, flipped: bool, field: int|null, name: string|null}  $config
     */
    public function __construct(public string $eventCode, public string $displayId, public array $config, public int $version = 0) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel("event.{$this->eventCode}.display")];
    }

    /**
     * @return array{display_id: string, config: array{type: string, mute: bool, flipped: bool, field: int|null, name: string|null}, version: int}
     */
    public function broadcastWith(): array
    {
        return ['display_id' => $this->displayId, 'config' => $this->config, 'version' => $this->version];
    }
}
