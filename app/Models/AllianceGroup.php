<?php

namespace App\Models;

use Database\Factories\AllianceGroupFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AllianceGroup extends Model
{
    /** @use HasFactory<AllianceGroupFactory> */
    use HasFactory;

    protected $fillable = [
        'seed', 'captain_team_id', 'picked_team_id', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'created_at', 'updated_at',
    ];

    public function captainTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'captain_team_id');
    }

    public function pickedTeam(): BelongsTo
    {
        return $this->belongsTo(Team::class, 'picked_team_id');
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
