<?php

namespace App\Models;

use App\Enums\MatchStatus;
use App\Enums\PointsAwardedTo;
use App\Enums\RankingMethod;
use App\Enums\RefereeRole;
use App\Enums\ScoreKind;
use App\Enums\ScoreTarget;
use App\Services\GameAssets;
use Database\Factories\GameFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
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

    /** Foul levels a new game starts with: points each foul gives the opponent. */
    public const DEFAULT_FOULS = ['Minor foul' => 5, 'Major foul' => 15];

    protected $fillable = [
        'name', 'description', 'timing', 'ranking_method', 'logo_path', 'background_path', 'created_by',
    ];

    protected $hidden = [
        'created_by', 'logo_path', 'background_path',
    ];

    protected $appends = [
        'logo_url', 'background_url',
    ];

    protected static function booted(): void
    {
        static::deleted(fn (Game $game) => app(GameAssets::class)->deleteAll($game));
    }

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
     * @return Attribute<?string, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => GameAssets::url($this->logo_path));
    }

    /**
     * @return Attribute<?string, never>
     */
    protected function backgroundUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => GameAssets::url($this->background_path));
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
     * Gives a new game FTC style minor and major fouls, which an organiser can
     * rename, re-point or add to.
     */
    public function addDefaultFouls(): self
    {
        foreach (self::DEFAULT_FOULS as $name => $points) {
            $this->scoreTypes()->create([
                'name' => $name,
                'points' => $points,
                'target' => ScoreTarget::ALLIANCE,
                'kind' => ScoreKind::COUNT,
                'referee' => RefereeRole::PENALTY,
                'awarded_to' => PointsAwardedTo::OPPONENT,
                'created_by' => $this->created_by,
            ]);
        }

        return $this;
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
        $scoreTypeIdMap = [];

        foreach ($this->groups()->orderBy('id')->get() as $group) {
            $groupIdMap[$group->id] = $copy->groups()->create($group->only(['name', 'description', 'display_order']))->id;
        }

        foreach ($this->scoreTypes()->orderBy('id')->get() as $scoreType) {
            $scoreTypeIdMap[$scoreType->id] = $copy->scoreTypes()->create([
                'name' => $scoreType->name,
                'points' => $scoreType->points,
                'target' => $scoreType->target,
                'kind' => $scoreType->kind,
                'choice_set' => $scoreType->choice_set,
                'referee' => $scoreType->referee,
                'awarded_to' => $scoreType->awarded_to,
                'group_id' => $scoreType->group_id !== null ? ($groupIdMap[$scoreType->group_id] ?? null) : null,
                'created_by' => $createdBy,
            ])->id;
        }

        app(GameAssets::class)->copy($this, $copy, $scoreTypeIdMap);

        return $copy;
    }
}
