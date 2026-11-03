<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AllianceSelectionDecline extends Model
{
    use BelongsToEvent;

    protected $fillable = [
        'event_id', 'team_id', 'alliance_group_id', 'created_by',
    ];

    protected $hidden = [
        'created_by', 'created_at', 'updated_at',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function allianceGroup(): BelongsTo
    {
        return $this->belongsTo(AllianceGroup::class);
    }
}
