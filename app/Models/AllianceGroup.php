<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Database\Factories\AllianceGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AllianceGroup extends Model
{
    /** @use HasFactory<AllianceGroupFactory> */
    use BelongsToEvent, HasFactory;

    protected $fillable = [
        'event_id', 'seed', 'size', 'captain_team_id', 'picked_team_id', 'second_picked_team_id', 'pending_team_id', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'created_at', 'updated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['seed' => 'integer', 'size' => 'integer'];
    }

    public function captainTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'captain_team_id');
    }

    public function pickedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'picked_team_id');
    }

    public function secondPickedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'second_picked_team_id');
    }

    /**
     * The column the alliance's next pick goes in, or null once it has all
     * the partners its size calls for.
     */
    public function openPick(): ?string
    {
        return match (true) {
            $this->picked_team_id === null => 'picked_team_id',
            $this->size > 2 && $this->second_picked_team_id === null => 'second_picked_team_id',
            default => null,
        };
    }

    /**
     * The captain and the partners picked so far, in the order they joined.
     *
     * @return list<int>
     */
    public function memberIds(): array
    {
        return array_values(array_filter([$this->captain_team_id, $this->picked_team_id, $this->second_picked_team_id]));
    }

    public function pendingTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'pending_team_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
