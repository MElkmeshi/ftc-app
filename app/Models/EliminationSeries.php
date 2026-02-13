<?php

namespace App\Models;

use Database\Factories\EliminationSeriesFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EliminationSeries extends Model
{
    /** @use HasFactory<EliminationSeriesFactory> */
    use HasFactory;

    protected $fillable = [
        'round', 'alliance_group_1_id', 'alliance_group_2_id', 'winner_alliance_group_id', 'status', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'created_at', 'updated_at',
    ];

    public function allianceGroup1(): BelongsTo
    {
        return $this->belongsTo(AllianceGroup::class, 'alliance_group_1_id');
    }

    public function allianceGroup2(): BelongsTo
    {
        return $this->belongsTo(AllianceGroup::class, 'alliance_group_2_id');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(AllianceGroup::class, 'winner_alliance_group_id');
    }

    public function matches(): HasMany
    {
        return $this->hasMany(CompetitionMatch::class, 'elimination_series_id');
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
