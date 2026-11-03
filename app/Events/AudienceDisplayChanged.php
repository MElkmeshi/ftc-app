<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class AudienceDisplayChanged implements ShouldBroadcastNow
{
    /**
     * @param  array{mode: string, match_id: int|null, message: string|null, changed_at: string}  $display
     */
    public function __construct(public string $eventCode, public array $display) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel("event.{$this->eventCode}.display")];
    }

    /**
     * @return array{display: array{mode: string, match_id: int|null, message: string|null, changed_at: string}}
     */
    public function broadcastWith(): array
    {
        return ['display' => $this->display];
    }
}
