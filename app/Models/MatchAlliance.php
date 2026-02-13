<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class MatchAlliance extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'match_id', 'team_id', 'alliance_id', 'alliance_pos', 'score', 'counts_for_ranking', 'alliance_group_id', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'counts_for_ranking' => 'boolean',
        ];
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

    public function scores()
    {
        return $this->hasMany(Score::class, 'team_id', 'team_id')
            ->where('match_id', $this->match_id);
    }

    public function allianceGroup(): BelongsTo
    {
        return $this->belongsTo(AllianceGroup::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
