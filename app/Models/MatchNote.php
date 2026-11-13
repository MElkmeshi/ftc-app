<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Database\Factories\MatchNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A note the head referee writes about a match, optionally tagged with the
 * teams it concerns (FTC Live's Head Referee "Add Note").
 */
class MatchNote extends Model
{
    /** @use HasFactory<MatchNoteFactory> */
    use BelongsToEvent, HasFactory;

    protected $fillable = ['event_id', 'match_id', 'summary', 'detail', 'teams', 'created_by'];

    protected $hidden = ['event_id', 'created_by', 'updated_at'];

    protected function casts(): array
    {
        return [
            'teams' => 'array',
        ];
    }

    public function match(): BelongsTo
    {
        return $this->belongsTo(CompetitionMatch::class, 'match_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
