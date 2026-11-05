<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A team (and optionally a named person) given one place of an award. An
 * alliance award has several teams in the same place.
 */
class AwardWinner extends Model
{
    use BelongsToEvent, HasFactory;

    protected $fillable = ['event_id', 'award_id', 'place', 'team_id', 'recipient'];

    protected $hidden = ['event_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['place' => 'integer'];
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
