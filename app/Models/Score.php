<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Score extends Model
{
    use BelongsToEvent, HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id', 'match_id', 'team_id', 'alliance_id', 'score_type_id', 'points', 'client_request_id', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'client_request_id', 'deleted_at', 'created_at', 'updated_at',
    ];

    protected function casts(): array
    {
        return ['points' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (Score $score): void {
            if ($score->points === null) {
                $score->points = $score->scoreType?->points ?? 0;
            }
        });
    }

    public function match()
    {
        return $this->belongsTo(CompetitionMatch::class);
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function alliance()
    {
        return $this->belongsTo(Alliance::class);
    }

    public function scoreType()
    {
        return $this->belongsTo(ScoreType::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
