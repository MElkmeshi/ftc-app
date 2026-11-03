<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use BelongsToEvent, HasFactory;

    protected $fillable = [
        'event_id', 'name',
        'description',
        'display_order',
    ];

    public function scoreTypes()
    {
        return $this->hasMany(ScoreType::class);
    }
}
