<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An award given at the event (FTC Live's awards). It has `places` slots:
 * the winner, second place, third place and any runners up, each given to
 * one team or, when it is not a team award, to a named person.
 */
class Award extends Model
{
    use BelongsToEvent, HasFactory;

    public const MAX_PLACES = 50;

    protected $fillable = ['event_id', 'name', 'description', 'is_team_award', 'places', 'display_order'];

    protected $hidden = ['event_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['is_team_award' => 'boolean', 'places' => 'integer', 'display_order' => 'integer'];
    }

    /**
     * @return HasMany<AwardWinner, $this>
     */
    public function winners(): HasMany
    {
        return $this->hasMany(AwardWinner::class)->orderBy('place')->orderBy('id');
    }

    /**
     * The slots that have been given to someone, in the order they are
     * announced: the last place first and the winner last.
     *
     * @return Collection<int, AwardWinner>
     */
    public function announcedWinners(): Collection
    {
        return $this->winners
            ->filter(fn (AwardWinner $winner): bool => $winner->place <= $this->places && $winner->isGiven())
            ->unique('place')
            ->sortByDesc('place')
            ->values();
    }
}
