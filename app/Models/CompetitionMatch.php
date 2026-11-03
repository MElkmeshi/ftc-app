<?php

namespace App\Models;

use App\Enums\MatchStatus;
use App\Enums\MatchType;
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
        'event_id', 'number', 'type', 'round', 'field', 'elimination_series_id', 'start_time', 'status', 'started_at', 'duration_ms', 'ended_at', 'cancelled_at', 'submissions', 'created_by', 'updated_by',
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
     * Whether the referees of this alliance have submitted their scores, which
     * locks that alliance's scoring until they reopen it or the match ends.
     */
    public function isSubmittedFor(int $allianceId): bool
    {
        return collect($this->submissions ?? [])->contains('alliance_id', $allianceId);
    }

    /**
     * The alliances playing this match whose referees have not submitted yet.
     *
     * @return Collection<int, Alliance>
     */
    public function alliancesAwaitingSubmission(): Collection
    {
        return $this->matchAlliances->pluck('alliance')->unique('id')
            ->reject(fn (Alliance $alliance): bool => $this->isSubmittedFor($alliance->id))
            ->values();
    }
}
