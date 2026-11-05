<?php

namespace App\Models;

use App\Models\Concerns\BelongsToEvent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Team extends Model
{
    use BelongsToEvent, HasFactory, SoftDeletes;

    protected $fillable = [
        'event_id', 'number', 'name', 'organization', 'city', 'rookie_year', 'created_by', 'updated_by',
    ];

    protected $hidden = [
        'created_by', 'updated_by', 'deleted_at', 'created_at', 'updated_at',
    ];

    /**
     * @return HasOne<Inspection, $this>
     */
    public function inspection(): HasOne
    {
        return $this->hasOne(Inspection::class);
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
