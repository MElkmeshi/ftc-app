<?php

namespace App\Models;

use App\Enums\MatchStatus;
use App\Enums\RankingMethod;
use Database\Factories\GameFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A reusable game definition: the score groups and score types referees
 * tap, the match timing and how teams are ranked. Events pick a game, so
 * every meet of a league can run on the same one, and one server can run
 * any game without code changes.
 *
 * Editing a game changes it for every event that plays it. Scores already
 * recorded keep the points they were worth when they were scored.
 */
class Game extends Model
{
    /** @use HasFactory<GameFactory> */
    use HasFactory;

    /** Timing keys a game may override; anything missing uses config/competition.php. */
    public const TIMING_KEYS = ['pre_match_countdown', 'autonomous', 'transition', 'teleop', 'endgame_warning', 'controllers_warning_offset'];

    protected $fillable = [
        'name', 'description', 'timing', 'ranking_method', 'created_by',
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
            'timing' => 'array',
            'ranking_method' => RankingMethod::class,
        ];
    }

    /**
     * @return HasMany<Event, $this>
     */
    public function events(): HasMany
    {
        return $this->hasMany(Event::class);
    }

    /**
     * @return HasMany<Group, $this>
     */
    public function groups(): HasMany
    {
        return $this->hasMany(Group::class)->withoutGlobalScope('game');
    }

    /**
     * @return HasMany<ScoreType, $this>
     */
    public function scoreTypes(): HasMany
    {
        return $this->hasMany(ScoreType::class)->withoutGlobalScope('game');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The events playing this game, each flagged when it has already played
     * matches (editing the game then changes what those events look like).
     *
     * @return list<array{code: string, name: string, has_played_matches: bool}>
     */
    public function eventSummaries(): array
    {
        return $this->events()
            ->orderBy('name')
            ->get(['id', 'code', 'name'])
            ->map(fn (Event $event): array => [
                'code' => $event->code,
                'name' => $event->name,
                'has_played_matches' => CompetitionMatch::query()
                    ->withoutGlobalScope('event')
                    ->where('event_id', $event->id)
                    ->whereIn('status', [MatchStatus::ONGOING, MatchStatus::COMPLETED])
                    ->exists(),
            ])
            ->all();
    }

    /**
     * Copies this game's definition into a new game.
     */
    public function duplicate(string $name, ?int $createdBy): self
    {
        $copy = self::query()->create([
            'name' => $name,
            'description' => $this->description,
            'timing' => $this->timing,
            'ranking_method' => $this->ranking_method,
            'created_by' => $createdBy,
        ]);

        $groupIdMap = [];

        foreach ($this->groups()->orderBy('id')->get() as $group) {
            $groupIdMap[$group->id] = $copy->groups()->create($group->only(['name', 'description', 'display_order']))->id;
        }

        foreach ($this->scoreTypes()->orderBy('id')->get() as $scoreType) {
            $copy->scoreTypes()->create([
                'name' => $scoreType->name,
                'points' => $scoreType->points,
                'target' => $scoreType->target,
                'group_id' => $scoreType->group_id !== null ? ($groupIdMap[$scoreType->group_id] ?? null) : null,
                'created_by' => $createdBy,
            ]);
        }

        return $copy;
    }
}
