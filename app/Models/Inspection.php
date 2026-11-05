<?php

namespace App\Models;

use App\Enums\InspectionStatus;
use App\Models\Concerns\BelongsToEvent;
use Database\Factories\InspectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One team's robot inspection: which checklist items the inspector has
 * ticked, their notes and the result.
 */
class Inspection extends Model
{
    /** @use HasFactory<InspectionFactory> */
    use BelongsToEvent, HasFactory;

    protected $fillable = ['event_id', 'team_id', 'status', 'checked', 'notes', 'updated_by'];

    protected $hidden = ['event_id', 'created_at'];

    /**
     * @var array<string, mixed>
     */
    protected $attributes = ['status' => 'not_started'];

    protected function casts(): array
    {
        return [
            'status' => InspectionStatus::class,
            'checked' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
