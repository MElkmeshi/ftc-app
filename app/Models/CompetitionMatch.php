<?php

namespace App\Models;

use App\Enums\MatchStatus;
use App\Enums\MatchType;
use App\Enums\RefereeRole;
use App\Models\Concerns\BelongsToEvent;
use Database\Factories\MatchFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class CompetitionMatch extends Model
{
    /** @use HasFactory<MatchFactory> */
    use BelongsToEvent, HasFactory, SoftDeletes;

    protected static function newFactory(): MatchFactory
    {
        return MatchFactory::new();
    }

    protected $table = 'matches';

    protected $fillable = [
        'event_id', 'number', 'type', 'round', 'field', 'elimination_series_id', 'start_time', 'status', 'started_at', 'duration_ms', 'ended_at', 'cancelled_at', 'submissions', 'referee_seats', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => MatchStatus::class,
            'type' => MatchType::class,
            'start_time' => 'datetime',
            'started_at' => 'datetime',
            'duration_ms' => 'integer',
            'field' => 'integer',
            'ended_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'submissions' => 'array',
            'referee_seats' => 'array',
        ];
    }

    public function scopeQualification(Builder $query): Builder
    {
        return $query->where('type', MatchType::QUALIFICATION);
    }

    public function scopeElimination(Builder $query): Builder
    {
        return $query->where('type', MatchType::ELIMINATION);
    }

    public function eliminationSeries(): BelongsTo
    {
        return $this->belongsTo(EliminationSeries::class);
    }

    public function matchAlliances()
    {
        return $this->hasMany(MatchAlliance::class, 'match_id');
    }

    public function scores()
    {
        return $this->hasMany(Score::class, 'match_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Whether this alliance's scoring or penalty referee has submitted, which
     * locks what they enter until they reopen it or the match ends.
     */
    public function isSubmittedFor(int $allianceId, RefereeRole $role = RefereeRole::SCORING): bool
    {
        return collect($this->submissions ?? [])->contains(
            fn (array $entry): bool => $entry['alliance_id'] === $allianceId && ($entry['role'] ?? RefereeRole::SCORING->value) === $role->value,
        );
    }

    /** Whether a penalty referee's tablet joined this alliance during the match. */
    public function hasPenaltySeat(int $allianceId): bool
    {
        return collect($this->referee_seats ?? [])->contains(
            fn (array $seat): bool => $seat['alliance_id'] === $allianceId && $seat['role'] === RefereeRole::PENALTY->value,
        );
    }

    /** The other alliance playing this match. */
    public function opponentOf(int $allianceId): ?int
    {
        return $this->matchAlliances()->where('alliance_id', '!=', $allianceId)->value('alliance_id');
    }

    /**
     * The referee seats the head referee is still waiting for: every
     * alliance's scoring referee, plus a penalty referee wherever one joined.
     *
     * @return Collection<int, array{alliance: Alliance, role: RefereeRole}>
     */
    public function seatsAwaitingSubmission(): Collection
    {
        return $this->matchAlliances->pluck('alliance')->unique('id')->values()
            ->flatMap(fn (Alliance $alliance): array => array_filter([
                ['alliance' => $alliance, 'role' => RefereeRole::SCORING],
                $this->hasPenaltySeat($alliance->id) ? ['alliance' => $alliance, 'role' => RefereeRole::PENALTY] : null,
            ]))
            ->reject(fn (array $seat): bool => $this->isSubmittedFor($seat['alliance']->id, $seat['role']))
            ->values();
    }
}
