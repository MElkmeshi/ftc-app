<?php

namespace App\Events;

use App\Models\AllianceGroup;
use App\Models\Team;
use Illuminate\Broadcasting\Channel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class AllianceSelectionUpdated implements ShouldBroadcastNow
{
    use SerializesModels;

    /**
     * @param  Collection<int, AllianceGroup>  $groups
     * @param  Collection<int, Team>  $declinedTeams
     */
    public function __construct(
        public string $action,
        public Collection $groups,
        public Collection $declinedTeams,
        public bool $complete,
        public ?int $currentPickSeed,
    ) {}

    /**
     * @return array<Channel>
     */
    public function broadcastOn(): array
    {
        return [new Channel('alliance-selection')];
    }

    /**
     * @return array{action: string, groups: Collection<int, AllianceGroup>, declined_teams: Collection<int, Team>, complete: bool, current_pick_seed: int|null}
     */
    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'groups' => $this->groups,
            'declined_teams' => $this->declinedTeams,
            'complete' => $this->complete,
            'current_pick_seed' => $this->currentPickSeed,
        ];
    }
}
