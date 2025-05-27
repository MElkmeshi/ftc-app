<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Score extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'match_id', 'team_id', 'score_type_id', 'points', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    public function match()
    {
        return $this->belongsTo(CompetitionMatch::class);
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
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
