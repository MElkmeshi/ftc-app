<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Who was given one slot of an award: a team, a named person (with or
 * without their team), and what the judges said about them.
 */
class AwardWinner extends Model
{
    use BelongsToEvent, HasFactory;

    protected $fillable = ['event_id', 'award_id', 'place', 'team_id', 'recipient', 'comment'];

    protected $hidden = ['event_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['place' => 'integer'];
    }

    public function isGiven(): bool
    {
        return $this->team_id !== null || filled($this->recipient);
    }

    /**
     * @return BelongsTo<Award, $this>
     */
    public function award(): BelongsTo
    {
        return $this->belongsTo(Award::class);
    }

    /**
     * @return BelongsTo<Team, $this>
     */
    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}
