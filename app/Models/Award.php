<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * An award given at the event, with up to three places (FTC Live's awards).
 */
class Award extends Model
{
    use BelongsToEvent, HasFactory;

    public const MAX_PLACES = 3;

    protected $fillable = ['event_id', 'name', 'description', 'places', 'display_order'];

    protected $hidden = ['event_id', 'created_at', 'updated_at'];

    protected function casts(): array
    {
        return ['places' => 'integer', 'display_order' => 'integer'];
    }

    /**
     * @return HasMany<AwardWinner, $this>
     */
    public function winners(): HasMany
    {
        return $this->hasMany(AwardWinner::class)->orderBy('place')->orderBy('id');
    }
}
