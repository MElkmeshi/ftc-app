<?php

namespace App\Models;

use App\Enums\MatchStatus;
use Database\Factories\MatchFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CompetitionMatch extends Model
{
    /** @use HasFactory<MatchFactory> */
    use HasFactory, SoftDeletes;

    protected static function newFactory(): MatchFactory
    {
        return MatchFactory::new();
    }

    protected $table = 'matches';

    protected $fillable = [
        'number', 'start_time', 'status', 'started_at', 'ended_at', 'cancelled_at', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => MatchStatus::class,
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
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
}
