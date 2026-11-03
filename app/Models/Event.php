<?php

namespace App\Models;

use App\Enums\EventType;
use Database\Factories\EventFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A competition run on this server. Every team, match, score and setting
 * belongs to one event, so a single install can host many events (and keep
 * past ones around for reference). Each event plays one game.
 */
class Event extends Model
{
    /** @use HasFactory<EventFactory> */
    use HasFactory;

    /** Event codes appear in URLs and broadcast channel names. */
    public const CODE_PATTERN = '/^[a-z0-9_]{2,32}$/';

    protected $fillable = [
        'game_id', 'code', 'name', 'type', 'venue', 'timezone', 'start_date', 'end_date', 'field_count', 'archived_at', 'created_by',
    ];

    protected $hidden = [
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => EventType::class,
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'field_count' => 'integer',
            'archived_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'code';
    }

    /**
     * @param  Builder<Event>  $query
     * @return Builder<Event>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNull('archived_at');
    }

    public function isArchived(): bool
    {
        return $this->archived_at !== null;
    }

    /**
     * Name of a public broadcast channel scoped to this event.
     */
    public function channel(string $suffix): string
    {
        return "event.{$this->code}.{$suffix}";
    }

    /**
     * @return HasMany<Team, $this>
     */
    public function teams(): HasMany
    {
        return $this->hasMany(Team::class);
    }

    /**
     * @return HasMany<CompetitionMatch, $this>
     */
    public function matches(): HasMany
    {
        return $this->hasMany(CompetitionMatch::class);
    }

    /**
     * The game this event plays: its score types, timing and ranking method.
     *
     * @return BelongsTo<Game, $this>
     */
    public function game(): BelongsTo
    {
        return $this->belongsTo(Game::class);
    }

    /**
     * Whether any score has been recorded, after which the event's game can no longer be swapped.
     */
    public function hasScores(): bool
    {
        return Score::query()->withoutGlobalScope('event')->where('event_id', $this->id)->exists();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
